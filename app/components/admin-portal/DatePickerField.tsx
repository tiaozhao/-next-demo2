import { useState, useCallback, useEffect } from "react";
import { TextField, Popover, DatePicker, Box } from "@shopify/polaris";
import { format, isSameDay } from "date-fns";
import { useFetchShopSettings } from "~/hooks/use-draft-order";
import {
  formatInTimeZone,
  fromZonedTime,
  toDate,
  toZonedTime,
} from "date-fns-tz";
import { TZDate } from "@date-fns/tz";

interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  labelHidden?: boolean;
  storeName: string;
}

export function DatePickerField({
  value,
  onChange,
  placeholder,
  label = "",
  labelHidden = true,
  storeName,
}: DatePickerFieldProps) {
  const [popoverActive, setPopoverActive] = useState(false);

  const { data: shopSettings } = useFetchShopSettings({
    storeName,
  });
  const [{ month, year }, setDate] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const [selectedDate, setSelectedDate] = useState({
    start: new Date(),
    end: new Date(),
  });

  const togglePopoverActive = useCallback(
    () => setPopoverActive((active) => !active),
    [],
  );

  const handleMonthChange = useCallback(
    (month: number, year: number) => setDate({ month, year }),
    [],
  );

  const handleDateChange = useCallback(
    ({ start }: { start: Date }) => {
      setSelectedDate({ start, end: start });

      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, "0");
      const day = String(start.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}T00:00:00`;

      const targetTimeZone =
        shopSettings?.shop?.ianaTimezone || "America/New_York";

      const dateInTargetZone = fromZonedTime(dateString, targetTimeZone);
      const formatted = formatInTimeZone(
        dateInTargetZone,
        targetTimeZone,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
      );

      onChange(new Date(formatted).toISOString());
      setPopoverActive(false);
    },
    [onChange, shopSettings],
  );

  const handleTextFieldChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange],
  );

  return (
    <Popover
      active={popoverActive}
      activator={
        <TextField
          label={label}
          placeholder={placeholder}
          value={
            value
              ? formatInTimeZone(
                  value,
                  shopSettings?.shop?.ianaTimezone || "America/New_York",
                  "yyyy-MM-dd",
                )
              : undefined
          }
          onChange={() => {}}
          autoComplete="off"
          labelHidden={labelHidden}
          onFocus={togglePopoverActive}
        />
      }
      onClose={togglePopoverActive}
    >
      <Box padding="400">
        <DatePicker
          month={month}
          year={year}
          onChange={handleDateChange}
          onMonthChange={handleMonthChange}
          selected={selectedDate}
          allowRange={false}
        />
      </Box>
    </Popover>
  );
}
