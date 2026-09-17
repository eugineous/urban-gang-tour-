'use client';

export default function SystemPanel({ onOpen, onRepair, repairMessage }: { onOpen: (tab: string) => void; onRepair: () => void; repairMessage: string }) {
  return <div className="cr-system">
    <section className="cr-system-card"><h2>Access & security</h2><p>Manage the owner password, permitted Google accounts, and staff roles here. These settings affect who can enter the Control Room.</p><div className="cr-system-links"><button onClick={() => onOpen('Security')}>Security settings</button><button onClick={() => onOpen('Admins')}>Staff access</button></div></section>
    <section className="cr-system-card"><h2>System tools</h2><p>Use repair and exports only when needed. Keeping them here prevents technical controls from interrupting everyday work.</p><div className="cr-system-links"><button onClick={onRepair}>Check / repair database</button><a href="/api/admin/backup" className="cr-system-link">Download full backup</a></div>{repairMessage && <p role="status" style={{ marginTop: 12 }}>{repairMessage}</p>}</section>
  </div>;
}
