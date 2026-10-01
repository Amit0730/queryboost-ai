"use client";

import { useState, useEffect } from "react";
import { formatQuery, analyzeSql, AnalysisResult } from "@/lib/sqlAnalyzer";
import { SqlEditor } from "@/components/sql-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Play, Eraser, AlignLeft, BookOpen, Lightbulb, CheckCircle2, AlertTriangle, XCircle, Moon, Sun, ArrowRight } from "lucide-react";
import ReactDiffViewer from "react-diff-viewer-continued";
import { useTheme } from "next-themes";

const EXAMPLES = [
  {
    name: "Basic SELECT *",
    query: "SELECT * FROM users WHERE status = 'active';",
  },
  {
    name: "Missing WHERE in DELETE",
    query: "DELETE FROM session_logs;",
  },
  {
    name: "Complex JOIN with OR",
    query: "SELECT DISTINCT u.id, u.name, o.total\nFROM users u\nJOIN orders o ON u.id = o.user_id\nWHERE o.status = 'pending' OR o.status = 'processing' OR o.status = 'shipped' OR o.status = 'delivered'\nORDER BY RAND();",
  },
];

interface AiAnalysis {
  explanation?: string;
  performance_concerns?: string[];
  optimization_suggestions?: string[];
  optimized_query?: string | null;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [dialect, setDialect] = useState("postgresql");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [staticAnalysis, setStaticAnalysis] = useState<AnalysisResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [eduMode, setEduMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const handleFormat = () => {
    if (!query.trim()) return;
    setQuery(formatQuery(query, dialect));
    toast.success("Query formatted!");
  };

  const handleClear = () => {
    setQuery("");
    setStaticAnalysis(null);
    setAiAnalysis(null);
  };

  const loadExample = (q: string) => {
    setQuery(q);
    setStaticAnalysis(null);
    setAiAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (!query.trim()) {
      toast.error("Please enter a SQL query to analyze.");
      return;
    }
    
    setIsAnalyzing(true);
    
    // 1. Static Analysis
    const staticRes = analyzeSql(query);
    setStaticAnalysis(staticRes);

    // 2. AI Analysis
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, dialect }),
      });
      
      if (!res.ok) {
        if (res.status === 503) {
          toast.info("AI Analysis unavailable (No API Key). Showing static analysis only.");
        } else {
          toast.error("Failed to fetch AI analysis.");
        }
        setAiAnalysis(null);
      } else {
        const data = await res.json();
        setAiAnalysis(data);
        toast.success("Analysis complete!");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during AI analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500";
    if (score >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow">
            QB
          </div>
          <span className="text-xl font-bold tracking-tight">QueryBoost AI</span>
          <Badge variant="outline" className="ml-2 hidden sm:inline-flex text-xs text-muted-foreground">
            Optimizer & Explainer
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Edu Mode</span>
            <Switch checked={eduMode} onCheckedChange={setEduMode} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open("https://github.com/Amit0730/queryboost-ai", "_blank")}>
            Star on GitHub
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        
        {/* Left Panel: Editor & Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Select value={dialect} onValueChange={(val: string | null) => setDialect(val || "postgresql")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Dialect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                  <SelectItem value="sqlserver">SQL Server</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select onValueChange={(val: string | null) => loadExample(val || "")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Examples" />
                </SelectTrigger>
                <SelectContent>
                  {EXAMPLES.map((ex, i) => (
                    <SelectItem key={i} value={ex.query}>
                      {ex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 min-h-[400px] flex flex-col relative border rounded-md shadow-sm overflow-hidden group">
            <SqlEditor value={query} onChange={setQuery} />
            
            {/* Editor Floating Toolbar */}
            <div className="absolute bottom-4 right-4 flex gap-2 opacity-10 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
              <Button variant="secondary" size="sm" onClick={handleFormat} className="shadow-md">
                <AlignLeft className="mr-2 h-4 w-4" /> Format
              </Button>
              <Button variant="secondary" size="sm" onClick={handleClear} className="shadow-md">
                <Eraser className="mr-2 h-4 w-4" /> Clear
              </Button>
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full text-lg shadow-lg hover:shadow-primary/25 transition-all"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !query.trim()}
          >
            {isAnalyzing ? (
              <span className="animate-pulse">Analyzing...</span>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" /> Analyze SQL
              </>
            )}
          </Button>

          {/* Landing/Welcome Text when empty */}
          {!staticAnalysis && !isAnalyzing && (
            <div className="mt-8 text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Understand. Optimize. Learn SQL.</h2>
              <p className="max-w-md mx-auto">
                Paste your SQL query above or select an example. We'll analyze it for performance bottlenecks, explain how it works, and suggest optimizations.
              </p>
            </div>
          )}
        </div>

        {/* Right Panel: Results */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
          {!staticAnalysis && !isAnalyzing && (
            <div className="flex h-full items-center justify-center border-2 border-dashed rounded-lg p-12 text-muted-foreground">
              <div className="flex flex-col items-center text-center">
                <Lightbulb className="h-12 w-12 mb-4 opacity-20" />
                <p>Run analysis to see detailed insights here.</p>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-32 bg-muted rounded-xl" />
              <div className="h-48 bg-muted rounded-xl" />
              <div className="h-64 bg-muted rounded-xl" />
            </div>
          )}

          {staticAnalysis && !isAnalyzing && (
            <div className="flex flex-col gap-6 animate-in slide-in-from-right-8 duration-500">
              
              {/* Score Card */}
              <Card className="border-l-4 border-l-primary shadow-md overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                  <span className="text-9xl font-bold">{staticAnalysis.score}</span>
                </div>
                <CardHeader>
                  <CardTitle>Analysis Score</CardTitle>
                  <CardDescription>Static heuristic evaluation (not an execution benchmark)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className={`text-5xl font-black tracking-tighter ${getScoreColor(staticAnalysis.score)}`}>
                      {staticAnalysis.score}
                      <span className="text-2xl text-muted-foreground">/100</span>
                    </div>
                    <div className="flex-1">
                      {staticAnalysis.score >= 90 ? (
                        <p className="text-sm font-medium text-emerald-500 flex items-center"><CheckCircle2 className="mr-1 h-4 w-4" /> Looks good! Few detected concerns.</p>
                      ) : staticAnalysis.score >= 70 ? (
                        <p className="text-sm font-medium text-yellow-500 flex items-center"><AlertTriangle className="mr-1 h-4 w-4" /> Some potential improvements found.</p>
                      ) : (
                        <p className="text-sm font-medium text-red-500 flex items-center"><XCircle className="mr-1 h-4 w-4" /> Significant potential concerns detected.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Static Issues */}
              {staticAnalysis.issues.length > 0 && (
                <Card className="border-red-500/20 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-red-500 flex items-center text-base">
                      <AlertTriangle className="mr-2 h-4 w-4" /> Detected Anti-Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {staticAnalysis.issues.map(issue => (
                      <div key={issue.id} className="rounded-md border p-4 bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{issue.title}</span>
                          <Badge variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "default" : "secondary"}>
                            {issue.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* AI Explanation (Educational Mode) */}
              {aiAnalysis && (eduMode || aiAnalysis.explanation) && (
                <Card className="border-blue-500/20 shadow-md">
                  <CardHeader className="pb-3 bg-blue-500/5">
                    <CardTitle className="text-blue-500 flex items-center text-base">
                      <BookOpen className="mr-2 h-4 w-4" /> 
                      {eduMode ? "Simple Explanation (Edu Mode)" : "Query Explanation"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {aiAnalysis.explanation || "No explanation provided."}
                  </CardContent>
                </Card>
              )}

              {/* AI Optimization Suggestions */}
              {aiAnalysis?.optimization_suggestions && aiAnalysis.optimization_suggestions.length > 0 && (
                <Card className="border-emerald-500/20 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-emerald-500 flex items-center text-base">
                      <Lightbulb className="mr-2 h-4 w-4" /> AI Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-outside pl-4 space-y-2 text-sm text-muted-foreground">
                      {aiAnalysis.optimization_suggestions.map((sug, i) => (
                        <li key={i}>{sug}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Diff Viewer */}
              {aiAnalysis?.optimized_query && aiAnalysis.optimized_query !== query && (
                <Card className="shadow-md overflow-hidden">
                  <CardHeader className="pb-3 bg-muted/30">
                    <CardTitle className="text-base flex items-center">
                      <ArrowRight className="mr-2 h-4 w-4 text-primary" /> Proposed Optimization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-[12px]">
                      <ReactDiffViewer 
                        oldValue={query} 
                        newValue={aiAnalysis.optimized_query} 
                        splitView={true} 
                        useDarkTheme={resolvedTheme === "dark"}
                        hideLineNumbers={false}
                        leftTitle="Original Query"
                        rightTitle="Optimized Suggestion"
                        styles={{
                          variables: {
                            light: {
                              diffViewerBackground: 'transparent',
                              diffViewerTitleBackground: 'transparent',
                            },
                            dark: {
                              diffViewerBackground: 'transparent',
                              diffViewerTitleBackground: 'transparent',
                            }
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
