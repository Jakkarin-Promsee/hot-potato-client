import type { FormulaNode } from "./types";

function latexOf(node?: FormulaNode): string {
  if (!node) return "";

  if (node.type === "row") {
    return (node.children ?? []).map(latexOf).join(" ");
  }

  if (node.type === "number" || node.type === "variable" || node.type === "symbol") {
    return node.value ?? "";
  }

  if (node.type === "power") {
    const base = latexOf(node.slots?.base);
    const exponent = latexOf(node.slots?.exponent);
    const position = node.powerPosition ?? "top-right";
    if (position === "bottom-right") return `{${base}}_{${exponent}}`;
    if (position === "top-left") return `{}^{${exponent}}{${base}}`;
    if (position === "bottom-left") return `{}_{${exponent}}{${base}}`;
    return `{${base}}^{${exponent}}`;
  }

  if (node.type === "fraction") {
    return `\\frac{${latexOf(node.slots?.numerator)}}{${latexOf(node.slots?.denominator)}}`;
  }

  if (node.type === "sqrt") {
    const index = latexOf(node.slots?.index);
    const content = latexOf(node.slots?.content);
    return index ? `\\sqrt[${index}]{${content}}` : `\\sqrt{${content}}`;
  }

  if (node.type === "abs") return `\\left|${latexOf(node.slots?.content)}\\right|`;
  if (node.type === "paren") return `\\left(${latexOf(node.slots?.content)}\\right)`;
  if (node.type === "bracket") return `\\left[${latexOf(node.slots?.content)}\\right]`;
  if (node.type === "summation") {
    return `\\sum_{${latexOf(node.slots?.lower)}}^{${latexOf(node.slots?.upper)}} ${latexOf(node.slots?.body)}`;
  }

  if (node.type === "trig") return `\\${node.value ?? "sin"}\\left(${latexOf(node.slots?.argument)}\\right)`;
  if (node.type === "invtrig")
    return `\\${node.value ?? "sin"}^{-1}\\left(${latexOf(node.slots?.argument)}\\right)`;
  if (node.type === "log")
    return `\\log_{${latexOf(node.slots?.base)}}\\left(${latexOf(node.slots?.argument)}\\right)`;
  if (node.type === "ln") return `\\ln\\left(${latexOf(node.slots?.argument)}\\right)`;
  if (node.type === "integral") {
    const prefix = node.value === "∮" ? "\\oint" : "\\int";
    return `${prefix}_{${latexOf(node.slots?.lower)}}^{${latexOf(node.slots?.upper)}} ${latexOf(node.slots?.integrand)} \\, d${latexOf(node.slots?.variable)}`;
  }

  return "";
}

export function formulaToLatex(node: FormulaNode): string {
  return latexOf(node).trim();
}
