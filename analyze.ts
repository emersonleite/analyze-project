import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import fs from "fs";
import path from "path";

const projectPath = path.join(__dirname, "../../eva-backend/src");
// Caminho do projeto NestJS/Vue 3

// Lista de funções e palavras-chave a serem mapeadas
const jsFunctions = [
  "map",
  "filter",
  "reduce",
  "forEach",
  "find",
  "sort",
  "some",
  "every",
  "flat",
  "flatMap",
  "splice",
  "slice",
  "push",
  "pop",
  "shift",
  "unshift",
  "split",
  "join",
  "toUpperCase",
  "toLowerCase",
  "trim",
  "trimStart",
  "trimEnd",
  "replace",
  "replaceAll",
  "match",
  "matchAll",
  "includes",
  "startsWith",
  "endsWith",
  "now",
  "toISOString",
  "toLocaleDateString",
  "toLocaleTimeString",
  "getFullYear",
  "getMonth",
  "getDate",
  "setFullYear",
  "setMonth",
  "setDate",
  "parseInt",
  "parseFloat",
  "Number",
  "String",
  "JSON.parse",
  "JSON.stringify",
  "Object.entries",
  "Object.keys",
  "Object.values",
  "round",
  "floor",
  "ceil",
  "max",
  "min",
  "random",
  "ref",
  "reactive",
  "computed",
  "watch",
  "watchEffect",
];

/* const jsKeywords = [
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "default",
  "try",
  "catch",
  "finally",
  "return",
  "throw",
  "async",
  "await",
] */

const stats: Record<string, number> = {};

function extractScriptFromVue(code: string): string {
  const match = code.match(/<script.*?>([\s\S]*?)<\/script>/);
  return match ? match[1] : "";
}

function analyzeFile(filePath: string) {
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".vue")) return;
  if (filePath.includes("config") || filePath.includes("main")) return;

  try {
    let code = fs.readFileSync(filePath, "utf-8");
    if (filePath.endsWith(".vue")) {
      code = extractScriptFromVue(code);
    }

    const ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators"],
    });

    traverse(ast, {
      CallExpression({ node }) {
        const functionName = node.callee?.property?.name;

        // Verificar se a chamada é a uma função JS comum
        if (jsFunctions.includes(functionName)) {
          stats[functionName] = (stats[functionName] || 0) + 1;
        }

        // Contagem de chamadas de método como Object.values, Object.keys, etc.
        if (
          node.callee?.object &&
          jsFunctions.includes(`${node.callee.object.name}.${functionName}`)
        ) {
          stats[`${node.callee.object.name}.${functionName}`] =
            (stats[`${node.callee.object.name}.${functionName}`] || 0) + 1;
        }
      },
      ClassMethod({ node }) {
        if (
          node.key.type === "Identifier" &&
          jsFunctions.includes(node.key.name)
        ) {
          stats[node.key.name] = (stats[node.key.name] || 0) + 1;
        }
      },
      AwaitExpression({ node }) {
        if (
          node.argument?.callee?.property?.name &&
          jsFunctions.includes(node.argument.callee.property.name)
        ) {
          stats[node.argument.callee.property.name] =
            (stats[node.argument.callee.property.name] || 0) + 1;
        }
      },
      // Captura palavras-chave JavaScript
      IfStatement({ node }) {
        stats["if"] = (stats["if"] || 0) + 1;
        if (node.alternate) {
          stats["else"] = (stats["else"] || 0) + 1;
        }
      },
      ForStatement() {
        stats["for"] = (stats["for"] || 0) + 1;
      },
      WhileStatement() {
        stats["while"] = (stats["while"] || 0) + 1;
      },
      DoWhileStatement() {
        stats["do"] = (stats["do"] || 0) + 1;
      },
      SwitchStatement() {
        stats["switch"] = (stats["switch"] || 0) + 1;
      },
      TryStatement() {
        stats["try"] = (stats["try"] || 0) + 1;
      },
      CatchClause() {
        stats["catch"] = (stats["catch"] || 0) + 1;
      },
      ReturnStatement() {
        stats["return"] = (stats["return"] || 0) + 1;
      },
      ThrowStatement() {
        stats["throw"] = (stats["throw"] || 0) + 1;
      },
      ArrowFunctionExpression() {
        stats["=>"] = (stats["=>"] || 0) + 1;
      },
      ClassDeclaration({ node }) {
        stats["class"] = (stats["class"] || 0) + 1;
        if (node.superClass) {
          stats["extends"] = (stats["extends"] || 0) + 1;
        }
        if (node.implements) {
          stats["implements"] = (stats["implements"] || 0) + 1;
        }
        if (node.decorators) {
          stats["decorators"] = (stats["decorators"] || 0) + 1;
        }
        if (node.abstract) {
          stats["abstract"] = (stats["abstract"] || 0) + 1;
        }
      },
      FunctionDeclaration() {
        stats["function"] = (stats["function"] || 0) + 1;
      },
      VariableDeclaration({ node }) {
        if (node.kind === "const") {
          stats["const"] = (stats["const"] || 0) + 1;
        }
        if (node.kind === "let") {
          stats["let"] = (stats["let"] || 0) + 1;
        }
        if (node.kind === "var") {
          stats["var"] = (stats["var"] || 0) + 1;
        }
      },
      ImportDeclaration() {
        stats["import"] = (stats["import"] || 0) + 1;
      },
      ExportNamedDeclaration() {
        stats["export"] = (stats["export"] || 0) + 1;
      },
      ExportDefaultDeclaration() {
        stats["export default"] = (stats["export default"] || 0) + 1;
      },
      ExportAllDeclaration() {
        stats["export *"] = (stats["export *"] || 0) + 1;
      },
    });
  } catch (error) {
    console.warn(`⚠️ Erro ao processar ${filePath}:`, (error as Error).message);
  }
}

function analyzeProject(dir: string) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      analyzeProject(fullPath);
    } else {
      analyzeFile(fullPath);
    }
  });
}

analyzeProject(projectPath);

// Ordenar estatísticas por frequência de uso (do mais usado para o menos usado)
const sortedStats = Object.fromEntries(
  Object.entries(stats).sort((a, b) => b[1] - a[1])
);

console.log(
  "📊 Estatísticas de uso de funções JS e palavras-chave em NestJS/Vue 3:",
  sortedStats
);
