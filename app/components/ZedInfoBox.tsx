'use client';

import { useState } from 'react';

export default function ZedInfoBox() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠</span>
        <div className="flex-1">
          <p className="text-amber-800 font-medium mb-1">Staff travel / ZED routes — space not guaranteed</p>
          <p className="text-amber-700 text-xs leading-relaxed">
            Routes shown are eligible routing options under the ZED interline agreement.
            Flights are free but subject to available space. You must self-issue tickets
            via{' '}
            <span className="font-mono">myIDTravel</span>{' '}
            and pay only taxes and fees. Boarding is not confirmed until space is allocated at the gate.
          </p>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-2 text-xs text-amber-600 hover:text-amber-900 underline underline-offset-2"
          >
            {open ? 'Hide package rules ▲' : 'View ZED package rules ▼'}
          </button>

          {open && (
            <ul className="mt-3 space-y-1 text-xs text-amber-700">
              {RULES.map((rule, i) => (
                <li key={i} className="flex gap-2">
                  <span className="flex-shrink-0 text-amber-400">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const RULES = [
  'Unlimited nominative tickets valid for 1 year from issuance.',
  'Tickets are non-transferable — personal use only.',
  '23 kg checked baggage included on each ticket.',
  'Flights are subject to available space at time of travel.',
  'You pay only airport taxes and carrier fees — the fare is free.',
  'Tickets are self-issued via the myIDTravel platform.',
  'Tickets may be changed (date/flight) multiple times within 3 months of issuance.',
  'Tickets may be cancelled within 1 month of issuance.',
  'Airlines may enter or leave the ZED agreement without prior notice.',
  'Courtesy protocol and appropriate dress code are required on all flights.',
  'This tool shows eligible routing options — routes are not confirmed bookings.',
];
