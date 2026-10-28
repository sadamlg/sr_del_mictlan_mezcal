'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { ACCOUNT_INPUT_CLASS, AccountField } from './account-ui';

const WEEKDAYS = [
  { short: 'D', name: 'domingo' },
  { short: 'L', name: 'lunes' },
  { short: 'M', name: 'martes' },
  { short: 'X', name: 'miércoles' },
  { short: 'J', name: 'jueves' },
  { short: 'V', name: 'viernes' },
  { short: 'S', name: 'sábado' },
];

const MONTHS = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat('es-MX', {
  month: 'long',
  timeZone: 'UTC',
}).format(new Date(Date.UTC(2026, month, 1))));

const dateDisplay = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const dateAccessible = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'full',
  timeZone: 'UTC',
});

const monthYearDisplay = new Intl.DateTimeFormat('es-MX', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

function utcDate(year, month, day) {
  return new Date(Date.UTC(year, month, day));
}

function toISODate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function parseISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = utcDate(year, month - 1, day);
  return toISODate(date) === value ? date : null;
}

function daysInMonth(year, month) {
  return utcDate(year, month + 1, 0).getUTCDate();
}

function latestAdultBirthDate(now = new Date()) {
  const year = now.getUTCFullYear() - 18;
  const month = now.getUTCMonth();
  const day = Math.min(now.getUTCDate(), daysInMonth(year, month));
  return utcDate(year, month, day);
}

function firstOfMonth(date) {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function clampDate(date, minimum, maximum) {
  if (date < minimum) return minimum;
  if (date > maximum) return maximum;
  return date;
}

function shiftMonth(date, amount) {
  const targetMonth = utcDate(date.getUTCFullYear(), date.getUTCMonth() + amount, 1);
  const day = Math.min(date.getUTCDate(), daysInMonth(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth()));
  return utcDate(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), day);
}

function calendarDays(month) {
  const first = firstOfMonth(month);
  const start = utcDate(first.getUTCFullYear(), first.getUTCMonth(), 1 - first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => utcDate(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate() + index,
  ));
}

function monthIndex(date) {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

export default function AccountDatePicker(props) {
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );

  if (!mounted) {
    const selectedDate = parseISODate(props.value);
    return (
      <AccountField id={props.id} label={props.label} error={props.error}>
        <button
          id={props.id}
          type="button"
          className={`${ACCOUNT_INPUT_CLASS} flex items-center justify-between gap-3 text-left focus:border-mictlan-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mictlan-teal ${props.error ? 'border-mictlan-red/70' : ''}`}
          aria-haspopup="dialog"
          aria-expanded="false"
          aria-required="true"
          aria-invalid={Boolean(props.error)}
          aria-describedby={props.error ? `${props.id}-error` : undefined}
        >
          <span className={selectedDate ? '' : 'text-mictlan-earth-muted'}>
            {selectedDate ? dateDisplay.format(selectedDate) : 'Selecciona una fecha'}
          </span>
          <CalendarDays size={18} className="shrink-0 text-mictlan-teal" aria-hidden="true" />
        </button>
      </AccountField>
    );
  }

  return <InteractiveDatePicker {...props} />;
}

function InteractiveDatePicker({ id, label, value, onChange, error }) {
  const selectedDate = parseISODate(value);
  const maximumDate = latestAdultBirthDate();
  const minimumYear = Math.min(1900, selectedDate?.getUTCFullYear() ?? 1900);
  const minimumDate = utcDate(minimumYear, 0, 1);
  const initialDate = clampDate(selectedDate ?? maximumDate, minimumDate, maximumDate);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => firstOfMonth(initialDate));
  const [focusedDate, setFocusedDate] = useState(initialDate);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const dayButtonRefs = useRef(new Map());
  const pendingFocusDate = useRef(null);

  const focusedISO = toISODate(focusedDate);
  const viewedYear = viewMonth.getUTCFullYear();
  const viewedMonth = viewMonth.getUTCMonth();
  const maxYear = maximumDate.getUTCFullYear();
  const maxMonth = maximumDate.getUTCMonth();
  const monthOptions = MONTHS.slice(0, viewedYear === maxYear ? maxMonth + 1 : 12);
  const years = Array.from({ length: maxYear - minimumYear + 1 }, (_, index) => maxYear - index);
  const days = calendarDays(viewMonth);

  useEffect(() => {
    if (open && pendingFocusDate.current) {
      dayButtonRefs.current.get(pendingFocusDate.current)?.focus();
      pendingFocusDate.current = null;
    }
  }, [open, focusedISO, viewMonth]);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsidePointer(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  function focusDate(date) {
    const boundedDate = clampDate(date, minimumDate, maximumDate);
    const iso = toISODate(boundedDate);
    pendingFocusDate.current = iso;
    setFocusedDate(boundedDate);
    setViewMonth(firstOfMonth(boundedDate));
  }

  function toggleCalendar() {
    if (open) {
      setOpen(false);
      return;
    }
    const date = clampDate(parseISODate(value) ?? maximumDate, minimumDate, maximumDate);
    pendingFocusDate.current = toISODate(date);
    setFocusedDate(date);
    setViewMonth(firstOfMonth(date));
    setOpen(true);
  }

  function closeCalendar(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function selectDate(date) {
    onChange(toISODate(date));
    closeCalendar(true);
  }

  function changeMonth(month) {
    const date = utcDate(viewedYear, month, Math.min(focusedDate.getUTCDate(), daysInMonth(viewedYear, month)));
    const boundedDate = clampDate(date, minimumDate, maximumDate);
    setViewMonth(firstOfMonth(boundedDate));
    setFocusedDate(boundedDate);
  }

  function changeYear(year) {
    const date = utcDate(Number(year), viewedMonth, Math.min(focusedDate.getUTCDate(), daysInMonth(Number(year), viewedMonth)));
    const boundedDate = clampDate(date, minimumDate, maximumDate);
    setViewMonth(firstOfMonth(boundedDate));
    setFocusedDate(boundedDate);
  }

  function moveFromKeyboard(event, date) {
    let nextDate;
    if (event.key === 'ArrowLeft') nextDate = utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1);
    else if (event.key === 'ArrowRight') nextDate = utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
    else if (event.key === 'ArrowUp') nextDate = utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 7);
    else if (event.key === 'ArrowDown') nextDate = utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 7);
    else if (event.key === 'PageUp') nextDate = shiftMonth(date, event.shiftKey ? -12 : -1);
    else if (event.key === 'PageDown') nextDate = shiftMonth(date, event.shiftKey ? 12 : 1);
    else if (event.key === 'Home') nextDate = utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - date.getUTCDay());
    else if (event.key === 'End') nextDate = utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 6 - date.getUTCDay());
    else return;

    event.preventDefault();
    focusDate(nextDate);
  }

  const previousMonthDisabled = monthIndex(viewMonth) <= monthIndex(minimumDate);
  const nextMonthDisabled = monthIndex(viewMonth) >= monthIndex(maximumDate);
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div ref={containerRef}>
      <AccountField id={id} label={label} error={error}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className={`${ACCOUNT_INPUT_CLASS} flex items-center justify-between gap-3 text-left focus:border-mictlan-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mictlan-teal ${error ? 'border-mictlan-red/70' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-required="true"
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onClick={toggleCalendar}
        >
          <span className={selectedDate ? '' : 'text-mictlan-earth-muted'}>
            {selectedDate ? dateDisplay.format(selectedDate) : 'Selecciona una fecha'}
          </span>
          <CalendarDays size={18} className="shrink-0 text-mictlan-teal" aria-hidden="true" />
        </button>

        {open && (
          <div
            className="absolute left-0 top-full z-30 mt-2 w-[calc(100vw-3rem)] max-w-80 border border-mictlan-earth-muted/40 bg-mictlan-carbon p-4 text-mictlan-bone shadow-[0_18px_45px_rgba(0,0,0,0.55)]"
            role="dialog"
            aria-label="Calendario de fecha de nacimiento"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                closeCalendar(true);
              }
            }}
          >
            <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-1.5">
              <button
                type="button"
                className="flex size-9 items-center justify-center text-mictlan-sage-muted transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mictlan-teal disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Mes anterior"
                disabled={previousMonthDisabled}
                onClick={() => changeMonth(viewedMonth - 1)}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <select
                className="h-9 min-w-0 border border-mictlan-sand/20 bg-mictlan-ink px-2 font-ui text-xs capitalize text-mictlan-ivory focus:border-mictlan-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mictlan-teal"
                aria-label="Mes de nacimiento"
                value={viewedMonth}
                onChange={(event) => changeMonth(Number(event.target.value))}
              >
                {monthOptions.map((month, index) => <option key={month} value={index}>{month}</option>)}
              </select>
              <select
                className="h-9 min-w-0 border border-mictlan-sand/20 bg-mictlan-ink px-2 font-ui text-xs text-mictlan-ivory focus:border-mictlan-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mictlan-teal"
                aria-label="Año de nacimiento"
                value={viewedYear}
                onChange={(event) => changeYear(event.target.value)}
              >
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              <button
                type="button"
                className="flex size-9 items-center justify-center text-mictlan-sage-muted transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mictlan-teal disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Mes siguiente"
                disabled={nextMonthDisabled}
                onClick={() => changeMonth(viewedMonth + 1)}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>

            <div role="grid" aria-label={monthYearDisplay.format(viewMonth)}>
              <div role="row" className="mb-1 grid grid-cols-7">
                {WEEKDAYS.map((weekday) => (
                  <span key={weekday.name} role="columnheader" aria-label={weekday.name} className="flex h-8 items-center justify-center font-ui text-[0.65rem] uppercase tracking-wide text-mictlan-sage-muted">
                    {weekday.short}
                  </span>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, week) => (
                <div key={week} role="row" className="grid grid-cols-7">
                  {days.slice(week * 7, week * 7 + 7).map((date) => {
                    const iso = toISODate(date);
                    const isSelected = iso === value;
                    const isOutsideMonth = date.getUTCMonth() !== viewedMonth;
                    const disabled = date < minimumDate || date > maximumDate;
                    return (
                      <div key={iso} role="gridcell" aria-selected={isSelected}>
                        <button
                          ref={(element) => {
                            if (element) dayButtonRefs.current.set(iso, element);
                            else dayButtonRefs.current.delete(iso);
                          }}
                          type="button"
                          className={`mx-auto flex size-7 items-center justify-center border text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mictlan-teal min-[360px]:size-8 sm:size-10 disabled:cursor-not-allowed disabled:opacity-25 ${isSelected ? 'border-mictlan-teal/60 bg-mictlan-teal-deep text-mictlan-bone' : 'border-transparent hover:bg-mictlan-teal/10'} ${isOutsideMonth ? 'text-mictlan-earth-muted' : 'text-mictlan-ivory'}`}
                          aria-label={dateAccessible.format(date)}
                          tabIndex={iso === focusedISO ? 0 : -1}
                          disabled={disabled}
                          onClick={() => selectDate(date)}
                          onKeyDown={(event) => moveFromKeyboard(event, date)}
                        >
                          {date.getUTCDate()}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </AccountField>
    </div>
  );
}
