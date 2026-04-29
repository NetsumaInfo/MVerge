import { useState, useRef, useEffect, type ReactNode } from "react";
import { FaChevronDown } from "react-icons/fa";
import "../../styles/common/dropdown.css";

export interface DropdownOption<T> {
  value: T;
  label: string;
}

interface DropdownProps<T> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
  renderValue?: (selected: DropdownOption<T> | undefined) => ReactNode;
  renderOption?: (option: DropdownOption<T>, isActive: boolean) => ReactNode;
}

export default function Dropdown<T extends string | number>({
  options,
  value,
  onChange,
  className = "",
  disabled = false,
  renderValue,
  renderOption,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-dropdown ${className} ${isOpen ? "open" : ""} ${
        disabled ? "disabled" : ""
      }`}
    >
      <div className="dropdown-trigger" onClick={toggleDropdown}>
        <span className="dropdown-value">
          {renderValue ? renderValue(selectedOption) : (selectedOption?.label || value)}
        </span>
        <FaChevronDown className={`dropdown-icon ${isOpen ? "rotate" : ""}`} />
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          {options.map((option) => (
            <div
              key={option.value}
              className={`dropdown-item ${
                option.value === value ? "active" : ""
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {renderOption
                ? renderOption(option, option.value === value)
                : option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
