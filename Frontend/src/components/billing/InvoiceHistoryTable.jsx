import Badge from '../Badge';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatAmount = (amount, currency) => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return '-';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(numeric);
};

const InvoiceHistoryTable = ({ invoices = [], isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-bg3/40 px-4 py-8 text-center text-sm text-text2">
        Loading invoice history...
      </div>
    );
  }

  if (!invoices.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-bg3/30 px-4 py-8 text-center text-sm text-text2">
        No invoices yet for this organisation.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border bg-bg3/20 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text3">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="text-text2">
                <td className="px-4 py-3">{formatDate(invoice.date)}</td>
                <td className="px-4 py-3">{formatAmount(invoice.amount, invoice.currency)}</td>
                <td className="px-4 py-3">
                  <Badge tone={invoice.status === 'paid' ? 'success' : 'error'}>
                    {invoice.status === 'paid' ? 'Paid' : 'Failed'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {invoice.pdfUrl ? (
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand transition hover:text-brand-dark"
                    >
                      Download PDF
                    </a>
                  ) : (
                    <span className="text-text3">Not available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceHistoryTable;
