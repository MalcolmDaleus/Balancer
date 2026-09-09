import type { LedgerFact, LedgerFactDomain } from '@/types/api';

export type LedgerMainTab = 'Feed' | 'Income' | 'Purchases' | 'Debts' | 'Recurring' | 'Savings';

export type LedgerFocus = {
    domain: LedgerFactDomain;
    sourceId: number;
    instrumentId: number | null;
    occurredOn: string;
};

export function tabForDomain(domain: LedgerFactDomain): Exclude<LedgerMainTab, 'Feed'> {
    switch (domain) {
        case 'income':
            return 'Income';
        case 'spending':
            return 'Purchases';
        case 'debt':
            return 'Debts';
        case 'recurring':
            return 'Recurring';
        case 'savings':
            return 'Savings';
    }
}

export function focusFromFact(fact: LedgerFact): LedgerFocus {
    return {
        domain: fact.domain,
        sourceId: fact.source_id,
        instrumentId: fact.instrument_id,
        occurredOn: fact.occurred_on,
    };
}
