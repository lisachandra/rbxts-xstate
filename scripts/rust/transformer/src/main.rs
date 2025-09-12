use full_moon::{
    ast::{
        self,
        Expression,
        FunctionArgs,
        FunctionCall,
        Index,
        LocalAssignment,
        Prefix,
        Suffix,
        Var,
        VarExpression,
        Call,
        MethodCall,
        span::ContainedSpan,
        punctuated::{ Pair, Punctuated },
    },
    parse_fallible,
    tokenizer::{ Token, TokenReference, TokenType, Symbol, StringLiteralQuoteType },
    visitors::VisitorMut,
    LuaVersion,
};
use serde::Deserialize;
use std::{ collections::HashMap, env, fs, path::{ Path, PathBuf }, thread };
use walkdir::WalkDir;

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct SourcemapNode {
    name: String,
    #[serde(default)]
    children: Vec<SourcemapNode>,
    #[serde(default)]
    file_paths: Vec<String>,
}

struct SourcemapData {
    roblox_to_fs: HashMap<String, PathBuf>,
    fs_to_roblox: HashMap<PathBuf, String>,
    fs_projects: Vec<PathBuf>,
}

fn build_path_maps(
    node: &SourcemapNode,
    maps: &mut SourcemapData,
    current_roblox_path: &str,
    base_dir: &Path
) {
    let new_roblox_path = if current_roblox_path.is_empty() {
        node.name.split('.').last().unwrap_or("").to_string()
    } else {
        format!("{}.{}", current_roblox_path, node.name)
    };

    if let Some(file_path) = node.file_paths.get(0) {
        let fs_path = dunce
            ::canonicalize(Path::new(&base_dir.join(file_path)))
            .expect(&format!("Failed to canonicalize {}", file_path));

        maps.roblox_to_fs.insert(new_roblox_path.clone(), fs_path.clone());
        maps.fs_to_roblox.insert(fs_path.clone(), new_roblox_path.clone());

        for project_file_path in node.file_paths.iter().skip(1) {
            if project_file_path.ends_with(".project.json") {
                maps.fs_projects.push(fs_path.clone());
            }
        }
    }

    for child in &node.children {
        build_path_maps(child, maps, &new_roblox_path, base_dir);
    }
}

fn roblox_path_to_luau_require(source_roblox_path: &str, target_roblox_path: &str) -> String {
    let source_parts: Vec<&str> = source_roblox_path.split('.').collect();
    let target_parts: Vec<&str> = target_roblox_path.split('.').collect();

    let mut common_len = 0;
    while
        common_len < source_parts.len() &&
        common_len < target_parts.len() &&
        source_parts[common_len] == target_parts[common_len]
    {
        common_len += 1;
    }

    let mut result_parts = vec!["script".to_string()];
    let parents_needed = source_parts.len() - common_len;
    result_parts.extend(std::iter::repeat("Parent".to_string()).take(parents_needed));
    result_parts.extend(target_parts[common_len..].iter().map(|s| s.to_string()));

    result_parts.join(".")
}

// --- TSTransformer ---

struct TSTransformer<'a> {
    current_fs_path: &'a Path,
    sourcemap_data: &'a SourcemapData,
    runtime_fs_path: &'a Path,
}

impl<'a> TSTransformer<'a> {
    fn create_findchild_call(&self, path_expression: String) -> Expression {
        let parts: Vec<&str> = path_expression.split('.').collect();

        // Create the base prefix using TokenReference
        let prefix = Prefix::Name(
            TokenReference::new(
                Vec::new(),
                Token::new(TokenType::Identifier { identifier: parts[0].into() }),
                Vec::new()
            )
        );

        let mut suffixes: Vec<Suffix> = Vec::new();

        // Create :FindFirstChild() method calls for each part after the first
        for part in &parts[1..] {
            if part == &"Parent" {
                // Use direct property access for "Parent"
                suffixes.push(
                    Suffix::Index(Index::Dot {
                        dot: TokenReference::new(
                            Vec::new(),
                            Token::new(TokenType::Symbol { symbol: Symbol::Dot }),
                            Vec::new()
                        ),
                        name: TokenReference::new(
                            Vec::new(),
                            Token::new(TokenType::Identifier { identifier: (*part).into() }),
                            Vec::new()
                        ),
                    })
                );
            } else {
                // Add method call suffix for :FindFirstChild("part")
                let method_call = Suffix::Call(
                    Call::MethodCall(
                        MethodCall::new(
                            TokenReference::new(
                                Vec::new(),
                                Token::new(TokenType::Identifier {
                                    identifier: "FindFirstChild".into(),
                                }),
                                Vec::new()
                            ),
                            FunctionArgs::Parentheses {
                                parentheses: ContainedSpan::new(
                                    TokenReference::new(
                                        Vec::new(),
                                        Token::new(TokenType::Symbol { symbol: Symbol::LeftParen }),
                                        Vec::new()
                                    ),
                                    TokenReference::new(
                                        Vec::new(),
                                        Token::new(TokenType::Symbol {
                                            symbol: Symbol::RightParen,
                                        }),
                                        Vec::new()
                                    )
                                ),
                                arguments: {
                                    let mut args = Punctuated::new();
                                    args.push(
                                        Pair::End(
                                            Expression::String(
                                                TokenReference::new(
                                                    Vec::new(),
                                                    Token::new(TokenType::StringLiteral {
                                                        literal: (*part).into(),
                                                        multi_line_depth: 0,
                                                        quote_type: StringLiteralQuoteType::Double,
                                                    }),
                                                    Vec::new()
                                                )
                                            )
                                        )
                                    );
                                    args
                                },
                            }
                        )
                    )
                );
                suffixes.push(method_call);
            }
        }

        if suffixes.is_empty() {
            // Just return the base name if no parts to chain
            Expression::Var(
                Var::Name(
                    TokenReference::new(
                        Vec::new(),
                        Token::new(TokenType::Identifier { identifier: parts[0].into() }),
                        Vec::new()
                    )
                )
            )
        } else {
            // Create a VarExpression with the method call chain
            let var_expr = VarExpression::new(prefix).with_suffixes(suffixes);
            Expression::Var(Var::Expression(Box::new(var_expr)))
        }
    }

    fn create_find_child_require_call(&self, path_expression: String) -> Expression {
        self.create_require_call_with_expression(self.create_findchild_call(path_expression))
    }

    fn create_require_call(&self, path_expression: String) -> Expression {
        let parts: Vec<&str> = path_expression.split('.').collect();

        // Create the base prefix using TokenReference
        let prefix = Prefix::Name(
            TokenReference::new(
                Vec::new(),
                Token::new(TokenType::Identifier { identifier: parts[0].into() }),
                Vec::new()
            )
        );

        // Create suffixes using bracket notation
        let suffixes: Vec<Suffix> = parts[1..]
            .iter()
            .map(|part| {
                Suffix::Index(Index::Brackets {
                    brackets: ContainedSpan::new(
                        TokenReference::symbol("[").unwrap(),
                        TokenReference::symbol("]").unwrap()
                    ),
                    expression: Expression::String(
                        TokenReference::new(
                            Vec::new(),
                            Token::new(TokenType::StringLiteral {
                                literal: (*part).into(),
                                multi_line_depth: 0,
                                quote_type: StringLiteralQuoteType::Double,
                            }),
                            Vec::new()
                        )
                    ),
                })
            })
            .collect();

        let var_expr = VarExpression::new(prefix).with_suffixes(suffixes);
        let path_arg = Expression::Var(Var::Expression(Box::new(var_expr)));

        self.create_require_call_with_expression(path_arg)
    }

    fn create_require_call_with_expression(&self, argument: Expression) -> Expression {
        let require_prefix = Prefix::Name(
            TokenReference::new(
                Vec::new(),
                Token::new(TokenType::Identifier {
                    identifier: "require".into(),
                }),
                Vec::new()
            )
        );

        let mut arguments = Punctuated::new();
        arguments.push(Pair::End(argument));

        let call_suffix = Suffix::Call(
            Call::AnonymousCall(FunctionArgs::Parentheses {
                parentheses: ContainedSpan::new(
                    TokenReference::new(
                        Vec::new(),
                        Token::new(TokenType::Symbol {
                            symbol: Symbol::LeftParen,
                        }),
                        Vec::new()
                    ),
                    TokenReference::new(
                        Vec::new(),
                        Token::new(TokenType::Symbol {
                            symbol: Symbol::RightParen,
                        }),
                        vec![
                            Token::new(TokenType::Whitespace {
                                characters: "\n".into(),
                            })
                        ]
                    )
                ),
                arguments,
            })
        );

        Expression::FunctionCall(FunctionCall::new(require_prefix).with_suffixes(vec![call_suffix]))
    }

    fn extract_string_literal(&self, token: &TokenReference) -> String {
        token
            .token()
            .to_string()
            .trim_matches(|c| (c == '"' || c == '\''))
            .to_string()
    }

    fn is_ts_runtime_assignment(&self, expr: &Expression) -> bool {
        matches!(expr, Expression::Var(Var::Expression(var_expr)) if self.is_global_script_access(var_expr))
    }

    fn is_global_script_access(&self, var_expr: &VarExpression) -> bool {
        if let Prefix::Name(name) = var_expr.prefix() {
            if name.token().to_string() == "_G" {
                if
                    let Some(Suffix::Index(Index::Brackets { expression, .. })) = var_expr
                        .suffixes()
                        .next()
                {
                    if let Expression::Var(Var::Name(script_name)) = expression {
                        return script_name.token().to_string() == "script";
                    }
                }
            }
        }
        false
    }

    fn get_ts_method_name(&self, call: &FunctionCall) -> Option<String> {
        if let Prefix::Name(name) = call.prefix() {
            if name.token().to_string() == "TS" {
                for suffix in call.suffixes() {
                    match suffix {
                        Suffix::Index(Index::Dot { name, .. }) => {
                            return Some(name.token().to_string());
                        }
                        Suffix::Index(Index::Brackets { expression, .. }) => {
                            if let Expression::String(token) = expression {
                                return Some(self.extract_string_literal(token));
                            }
                        }
                        _ => {
                            continue;
                        }
                    }
                }
            }
        }
        None
    }

    fn translate_literal_path(&self, arguments: &Punctuated<Expression>) -> Option<String> {
        let first_path_part = arguments.iter().nth(1)?;

        // Check if the second argument is a TS.getModule() call
        if let Expression::FunctionCall(func_call) = first_path_part {
            if let Some(method_name) = self.get_ts_method_name(func_call) {
                if method_name == "getModule" {
                    if
                        let Some(
                            Suffix::Call(
                                ast::Call::AnonymousCall(
                                    FunctionArgs::Parentheses { arguments: getmodule_args, .. },
                                ),
                            ),
                        ) = func_call.suffixes().find(|suffix| matches!(suffix, Suffix::Call(_)))
                    {
                        return self.resolve_getmodule_call_from_args(getmodule_args);
                    }
                }
            }
        }

        // Check if it's a Var expression containing a TS.getModule() call
        if let Expression::Var(Var::Expression(var_expr)) = first_path_part {
            if let Prefix::Name(name_token) = var_expr.prefix() {
                if name_token.token().to_string() == "TS" {
                    let suffixes: Vec<_> = var_expr.suffixes().collect();

                    // Check if first suffix is .getModule and find the Call suffix
                    if
                        let (Some(first_suffix), call_position) = (
                            suffixes.first(),
                            suffixes.iter().position(|suffix| matches!(suffix, Suffix::Call(_))),
                        )
                    {
                        if let Suffix::Index(Index::Dot { name, .. }) = first_suffix {
                            if name.token().to_string() == "getModule" {
                                if let Some(call_pos) = call_position {
                                    if
                                        let Suffix::Call(
                                            ast::Call::AnonymousCall(
                                                FunctionArgs::Parentheses {
                                                    arguments: getmodule_args,
                                                    ..
                                                },
                                            ),
                                        ) = &suffixes[call_pos]
                                    {
                                        // Create a modified args list with the suffix property name added
                                        let mut modified_args = getmodule_args.clone();

                                        // Add suffix property names as string literals
                                        for suffix in &suffixes[call_pos + 1..] {
                                            if let Suffix::Index(Index::Dot { name, .. }) = suffix {
                                                let property_name = name.token().to_string();
                                                let property_expr = Expression::String(
                                                    TokenReference::new(
                                                        vec![],
                                                        Token::new(TokenType::StringLiteral {
                                                            literal: property_name.into(),
                                                            multi_line_depth: 0,
                                                            quote_type: StringLiteralQuoteType::Double,
                                                        }),
                                                        vec![]
                                                    )
                                                );
                                                modified_args.push(Pair::End(property_expr));
                                            }
                                        }

                                        return self.resolve_getmodule_call_from_args(
                                            &modified_args
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Fallback to original logic for simple string literals
        let mut path_parts = Vec::new();
        path_parts.push(first_path_part.to_string());
        for arg in arguments.iter().skip(2) {
            if let Expression::String(token) = arg {
                path_parts.push(self.extract_string_literal(token));
            } else {
                return None;
            }
        }
        Some(path_parts.join("."))
    }

    fn resolve_getmodule_call_from_args(
        &self,
        arguments: &Punctuated<Expression>
    ) -> Option<String> {
        // Extract arguments from TS.getModule(script, "@rbxts", "package-name")
        let mut module_path_parts = Vec::new();

        // Skip first argument (script), extract remaining string arguments
        for arg in arguments.iter().skip(1) {
            if let Expression::String(token) = arg {
                module_path_parts.push(self.extract_string_literal(token));
            } else {
                return None;
            }
        }

        if module_path_parts.is_empty() {
            return None;
        }

        // Build the node_modules path: node_modules.@rbxts.package-name
        let node_modules_path = format!("node_modules.{}", module_path_parts.join("."));

        if let Some(target_roblox_path) = self.find_package_in_sourcemap(&node_modules_path) {
            if
                let Some(source_roblox_path) = self.sourcemap_data.fs_to_roblox.get(
                    self.current_fs_path
                )
            {
                return Some(roblox_path_to_luau_require(source_roblox_path, &target_roblox_path));
            }
        }
        None
    }

    fn find_package_in_sourcemap(&self, package_path: &str) -> Option<String> {
        for (roblox_path, _fs_path) in &self.sourcemap_data.roblox_to_fs {
            if roblox_path.ends_with(&package_path) {
                return Some(roblox_path.clone());
            }
        }
        None
    }
}

impl<'a> VisitorMut for TSTransformer<'a> {
    fn visit_local_assignment(&mut self, node: LocalAssignment) -> LocalAssignment {
        if let Some(first_expr) = node.expressions().iter().next() {
            if self.is_ts_runtime_assignment(first_expr) {
                if
                    let (Some(source_roblox), Some(target_roblox)) = (
                        self.sourcemap_data.fs_to_roblox.get(self.current_fs_path),
                        self.sourcemap_data.fs_to_roblox.get(self.runtime_fs_path),
                    )
                {
                    let path_str = roblox_path_to_luau_require(source_roblox, target_roblox);
                    let require_expr = self.create_find_child_require_call(path_str);

                    return node.with_expressions(
                        Punctuated::from_iter(vec![Pair::End(require_expr)])
                    );
                }
            }
        }
        node
    }

    fn visit_function_call(&mut self, node: FunctionCall) -> FunctionCall {
        if let Some(method_name) = self.get_ts_method_name(&node) {
            if method_name == "import" {
                if
                    let Some(call_suffix) = node
                        .suffixes()
                        .find(|suffix| matches!(suffix, Suffix::Call(_)))
                {
                    if
                        let Suffix::Call(
                            ast::Call::AnonymousCall(FunctionArgs::Parentheses { arguments, .. }),
                        ) = call_suffix
                    {
                        let path_str = self.translate_literal_path(arguments);

                        if let Some(path) = path_str {
                            if
                                let Expression::FunctionCall(fc) =
                                    self.create_find_child_require_call(path)
                            {
                                return fc;
                            }
                        }
                    }
                }
            }
        }
        node
    }

    fn visit_var_expression(&mut self, node: VarExpression) -> VarExpression {
        match node.clone().prefix() {
            Prefix::Name(name_token) => {
                if name_token.token().to_string() == "TS" {
                    let suffixes: Vec<&Suffix> = node.suffixes().collect();

                    // Look for Index::Dot followed by Call, then preserve remaining suffixes
                    if suffixes.len() >= 2 {
                        if
                            let (Suffix::Index(Index::Dot { name, .. }), Suffix::Call(call)) = (
                                &suffixes[0],
                                &suffixes[1],
                            )
                        {
                            let method_name = name.token().to_string();
                            if method_name == "import" {
                                if
                                    let ast::Call::AnonymousCall(
                                        FunctionArgs::Parentheses { arguments, .. },
                                    ) = call
                                {
                                    let path_str = self.translate_literal_path(arguments);
                                    if let Some(path) = path_str {
                                        if
                                            let Expression::FunctionCall(fc) =
                                                self.create_find_child_require_call(path)
                                        {
                                            // Preserve only the suffixes AFTER the TS.import() call
                                            let remaining_suffixes: Vec<Suffix> = suffixes[2..]
                                                .iter()
                                                .map(|&s| s.clone())
                                                .collect();

                                            return VarExpression::new(
                                                Prefix::Expression(
                                                    Box::new(Expression::FunctionCall(fc))
                                                )
                                            ).with_suffixes(remaining_suffixes);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // Handle other prefix types...
            _ => {}
        }
        node
    }
}

fn main() -> std::io::Result<()> {
    let args: Vec<String> = env::args().collect();
    if args.len() < 4 {
        eprintln!(
            "Usage: {} <transform_directory> <path/to/sourcemap.json> <path/to/runtime.luau>",
            args[0]
        );
        std::process::exit(1);
    }

    let transform_path = dunce::canonicalize(Path::new(&args[1]))?;
    let sourcemap_path = dunce::canonicalize(Path::new(&args[2]))?;
    let runtime_path = dunce::canonicalize(Path::new(&args[3]))?;
    let base_dir = sourcemap_path
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));

    // --- Spawn a new thread with a larger stack to run the main logic ---
    let builder = thread::Builder
        ::new()
        .name("parser_thread".into())
        .stack_size(8 * 1024 * 1024); // 8MB stack

    let handle = builder
        .spawn(move || {
            let mut maps = SourcemapData {
                roblox_to_fs: HashMap::new(),
                fs_to_roblox: HashMap::new(),
                fs_projects: Vec::new(),
            };
            let sourcemap_content = fs
                ::read_to_string(sourcemap_path)
                .expect("Failed to read sourcemap file");
            let sourcemap_root: SourcemapNode = serde_json
                ::from_str(&sourcemap_content)
                .expect("Failed to parse sourcemap JSON");

            build_path_maps(&sourcemap_root, &mut maps, "", base_dir.as_path());

            println!("Successfully built path maps with {} entries.", maps.roblox_to_fs.len());

            for entry in WalkDir::new(&transform_path)
                .into_iter()
                .filter_map(Result::ok)
                .filter(|e| {
                    let ext = e
                        .path()
                        .extension()
                        .map(|ext| {
                            ext.to_str()
                                .map(|s| s.to_lowercase())
                                .unwrap_or_default()
                        });
                    ext == Some("luau".to_string()) || ext == Some("lua".to_string())
                }) {
                let file_path = dunce
                    ::canonicalize(entry.path())
                    .expect("Failed to canonicalize path");

                // println!("Processing: {}", file_path.display());

                let code = fs::read_to_string(&file_path).expect("Failed to read file");
                if !code.contains("local TS = _G[script]") {
                    // println!("  -> Skipping: Does not contain 'local TS = _G[script]'");
                    continue;
                }

                let ast_result = parse_fallible(&code, LuaVersion::luau());
                if !ast_result.errors().is_empty() {
                    eprintln!("  -> Skipped due to parse errors: {:?}", ast_result.errors());
                    continue;
                }

                let mut transformer = TSTransformer {
                    current_fs_path: &file_path,
                    sourcemap_data: &maps,
                    runtime_fs_path: &runtime_path,
                };
                let transformed_ast = transformer.visit_ast(ast_result.ast().clone());
                fs::write(&file_path, transformed_ast.to_string()).expect(
                    "Failed to write transformed file"
                );
                println!("{} -> Transformed successfully.", file_path.display());
            }
        })
        .unwrap();

    // Wait for the new thread to finish
    handle.join().unwrap();

    Ok(())
}
