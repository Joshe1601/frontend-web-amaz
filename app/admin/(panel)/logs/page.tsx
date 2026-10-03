export default function LogsPage() {
  return <ComingSoon title="Inventory Logs" description="Trazabilidad de todos los movimientos de stock." />;
}

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>🚧</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--green-dark)', margin: 0 }}>{title}</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>{description}</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Próximamente disponible.</p>
    </div>
  );
}
