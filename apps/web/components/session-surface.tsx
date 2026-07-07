import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SessionRow = {
  label: string;
  value: string;
};

type SessionSurfaceProps = {
  contractRows: SessionRow[];
  detailRows: SessionRow[];
  notes: string[];
  subtitle: string;
  title: string;
};

export function SessionSurface({
  contractRows,
  detailRows,
  notes,
  subtitle,
  title,
}: SessionSurfaceProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
      <Card className="border-white/10 bg-card/90">
        <CardHeader>
          <CardTitle className="p-0">
            <h1 className="font-heading text-2xl uppercase tracking-[0.14em] text-foreground">
              {title}
            </h1>
          </CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {contractRows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="font-mono text-sm text-foreground">{row.value}</span>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Badge variant="secondary" className="rounded-full px-3 py-1 uppercase tracking-[0.2em]">
            SessionContext
          </Badge>
        </CardFooter>
      </Card>

      <div className="grid gap-4">
        <Card className="border-white/10 bg-card/90">
          <CardHeader>
            <CardTitle>
              <h2>Active membership</h2>
            </CardTitle>
            <CardDescription>Clerk-backed membership details for the active team.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {detailRows.map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="font-mono text-sm text-foreground">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/90">
          <CardHeader>
            <CardTitle>
              <h2>Surface notes</h2>
            </CardTitle>
            <CardDescription>Why this route exists in Phase 0.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {notes.map((note) => (
              <div
                key={note}
                className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-muted-foreground"
              >
                {note}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
