import { format } from "sql-formatter";

export interface SqlIssue {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export interface AnalysisResult {
  score: number;
  issues: SqlIssue[];
}

export function formatQuery(query: string, dialect: string = "postgresql"): string {
  try {
    return format(query, {
      language: dialect as any,
      keywordCase: "upper",
      linesBetweenQueries: 2,
    });
  } catch (error) {
    console.error("Format error", error);
    return query;
  }
}

export function analyzeSql(query: string): AnalysisResult {
  const issues: SqlIssue[] = [];
  const upperQuery = query.toUpperCase();
  let score = 100;

  // 1. SELECT *
  if (upperQuery.includes("SELECT *") || upperQuery.includes("SELECT  *")) {
    issues.push({
      id: "select-star",
      title: "Avoid SELECT *",
      description: "Using SELECT * can return unnecessary data, increasing memory usage and network transfer times. It also makes the query sensitive to schema changes. Specify only the columns you need.",
      severity: "high",
    });
    score -= 15;
  }

  // 2. Missing WHERE clause (basic check for UPDATE/DELETE/SELECT)
  const isSelect = upperQuery.includes("SELECT ");
  const isUpdate = upperQuery.includes("UPDATE ");
  const isDelete = upperQuery.includes("DELETE FROM ");
  
  if ((isSelect || isUpdate || isDelete) && !upperQuery.includes(" WHERE ")) {
    if (isUpdate || isDelete) {
      issues.push({
        id: "missing-where-mutation",
        title: "Missing WHERE in mutation",
        description: "An UPDATE or DELETE statement without a WHERE clause will modify or remove all rows in the table.",
        severity: "high",
      });
      score -= 30;
    } else {
      issues.push({
        id: "missing-where-select",
        title: "No filtering (Missing WHERE)",
        description: "Selecting without a WHERE clause will return all rows from the table, which can be very slow for large tables.",
        severity: "medium",
      });
      score -= 10;
    }
  }

  // 3. Unnecessary DISTINCT
  if (upperQuery.includes("SELECT DISTINCT")) {
    issues.push({
      id: "unnecessary-distinct",
      title: "Use of DISTINCT",
      description: "DISTINCT requires sorting or hashing the result set, which is expensive. Ensure it is actually needed, or see if a GROUP BY or correcting a JOIN condition is more appropriate.",
      severity: "medium",
    });
    score -= 5;
  }

  // 4. OR-heavy filtering (basic heuristic)
  const orCount = (upperQuery.match(/\bOR\b/g) || []).length;
  if (orCount > 3) {
    issues.push({
      id: "or-heavy",
      title: "Heavy use of OR",
      description: `Detected ${orCount} OR conditions. Consider using IN(...) or rewriting with UNION ALL for better index usage.`,
      severity: "low",
    });
    score -= 5;
  }

  // 5. LIKE with leading wildcard
  if (upperQuery.match(/LIKE\s+'%[^']+'/)) {
    issues.push({
      id: "leading-wildcard",
      title: "Leading Wildcard in LIKE",
      description: "Using a leading wildcard (e.g., LIKE '%term') prevents the database from using indexes, leading to a full table scan.",
      severity: "high",
    });
    score -= 15;
  }

  // 6. ORDER BY RAND()
  if (upperQuery.includes("ORDER BY RAND()") || upperQuery.includes("ORDER BY RANDOM()")) {
    issues.push({
      id: "order-by-rand",
      title: "ORDER BY RAND()",
      description: "Sorting by random is very slow on large tables because it must generate a random number for every row and then sort the entire set. Consider alternative sampling methods.",
      severity: "high",
    });
    score -= 15;
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return { score, issues };
}
