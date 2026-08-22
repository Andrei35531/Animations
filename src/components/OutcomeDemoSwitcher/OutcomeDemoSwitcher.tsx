import "./OutcomeDemoSwitcher.css"

export type OutcomeDemoId = "declined" | "success" | "expired"

const OPTIONS: { id: OutcomeDemoId; label: string }[] = [
  { id: "declined", label: "Отказано" },
  { id: "success", label: "Success" },
  { id: "expired", label: "Истёк срок" },
]

type OutcomeDemoSwitcherProps = {
  value: OutcomeDemoId
  onChange: (next: OutcomeDemoId) => void
}

export function OutcomeDemoSwitcher({ value, onChange }: OutcomeDemoSwitcherProps) {
  const activeIndex = Math.max(
    0,
    OPTIONS.findIndex((o) => o.id === value),
  )

  return (
    <div className="outcome-demo-switcher" role="tablist" aria-label="Демо статуса оплаты">
      <div className="outcome-demo-switcher__track">
        <span
          className="outcome-demo-switcher__thumb"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
          aria-hidden
        />
        {OPTIONS.map((opt) => {
          const selected = opt.id === value
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={[
                "outcome-demo-switcher__btn",
                selected ? "outcome-demo-switcher__btn--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onChange(opt.id)}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
