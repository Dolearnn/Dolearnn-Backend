function formatParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

function offsetForUtc(date: Date, timeZone: string) {
  const parts = formatParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

export function zonedLocalDateTimeToUtc(
  input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  },
  timeZone: string,
) {
  const guess = new Date(
    Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0, 0),
  );

  let utc = new Date(guess.getTime() - offsetForUtc(guess, timeZone));
  const refinedOffset = offsetForUtc(utc, timeZone);
  utc = new Date(guess.getTime() - refinedOffset);
  return utc;
}
