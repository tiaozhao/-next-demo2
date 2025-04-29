import { Icon, OptionList, Popover, Scrollable, TextField } from '@shopify/polaris';
import { useCallback, useEffect, useState } from 'react';

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
  label?: string;
  labelHidden?: boolean;
  helpText?: string;
  error?: string | boolean;
  disabled?: boolean;
  maxHeight?: string;
}

export function SelectField({ value, onChange, options, placeholder, label = '', labelHidden = true, helpText, error, disabled = false }: SelectFieldProps) {
  const [popoverActive, setPopoverActive] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Find the label of the selected option
  const selectedLabel = options.find((option) => option.value === value)?.label || '';

  // Filter options based on search input
  const filteredOptions = searchValue ? options.filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase())) : options;

  // Display text for the input field
  const displayText = value ? selectedLabel : '';

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (!popoverActive) {
        setPopoverActive(true);
      }
    },
    [popoverActive],
  );

  const handleOptionSelect = useCallback(
    (selectedValues: string[]) => {
      if (selectedValues.length > 0) {
        onChange(selectedValues[0]);
        setPopoverActive(false);
      }
    },
    [onChange],
  );

  const handleTextFieldClick = useCallback(() => {
    if (!disabled) {
      setPopoverActive(true);
    }
  }, [disabled]);

  const closePopover = useCallback(() => {
    setPopoverActive(false);
    setSearchValue('');
  }, []);

  // Clear search text when popover closes
  useEffect(() => {
    if (!popoverActive) {
      setSearchValue('');
    }
  }, [popoverActive]);

  return (
    <div>
      <Popover
        active={popoverActive}
        activator={
          <div
            className="w-[124px]"
            onClick={handleTextFieldClick}
          >
            <TextField
              label={label}
              labelHidden={labelHidden}
              value={displayText}
              onChange={handleSearchChange}
              autoComplete="off"
              onFocus={() => setPopoverActive(true)}
              error={error}
              disabled={disabled}
              helpText={helpText}
              placeholder={placeholder}
              suffix={
                <Icon
                  source="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'>
                <path d='M10.8839 4.32315C10.3957 3.83499 9.60427 3.83499 9.11612 4.32315L6.46967 6.96959C6.17678 7.26249 6.17678 7.73736 6.46967 8.03025C6.76256 8.32315 7.23744 8.32315 7.53033 8.03025L10 5.56058L12.4697 8.03025C12.7626 8.32315 13.2374 8.32315 13.5303 8.03025C13.8232 7.73736 13.8232 7.26249 13.5303 6.96959L10.8839 4.32315Z' fill='currentColor'/>
                <path d='M13.5303 13.0304L10.8839 15.6769C10.3957 16.165 9.60427 16.165 9.11612 15.6769L6.46967 13.0304C6.17678 12.7375 6.17678 12.2626 6.46967 11.9697C6.76256 11.6769 7.23744 11.6769 7.53033 11.9697L10 14.4394L12.4697 11.9697C12.7626 11.6769 13.2374 11.6769 13.5303 11.9697C13.8232 12.2626 13.8232 12.7375 13.5303 13.0304Z' fill='currentColor'/>
                </svg>"
                />
              }
            />
          </div>
        }
        onClose={closePopover}
      >
        <div>
          <Scrollable shadow>
            <OptionList
              options={filteredOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              selected={value ? [value] : []}
              onChange={handleOptionSelect}
            />
          </Scrollable>
        </div>
      </Popover>
    </div>
  );
}
