"use client";

const SUGGESTIONS = [
  "Which companies are dormant?",
  "Show unpaid invoices from this month",
  "List appointments that need follow-up",
  "What's the audit history for company acme-123?",
];

export function EmptyState({ onSelectSuggestion }: { onSelectSuggestion: (text: string) => void }) {
  return (
    <div className="assistant-empty">
      <div className="assistant-empty-heading">
        <h1>Ask the Companion</h1>
        <p>Appointments, companies, people, sites, invoices, audit history, messaging, and platform operations.</p>
      </div>
      <div className="assistant-suggestions">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="assistant-suggestion-card"
            onClick={() => onSelectSuggestion(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
