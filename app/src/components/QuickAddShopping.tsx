import { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { HOUSE } from "../lib/charm";
import { addShoppingItem } from "../lib/mutations";

/**
 * Single-line capture. Unlike one-offs there are no extra fields, so Enter
 * commits and keeps focus — you can rattle off "milk / soap / bin bags"
 * without lifting a thumb.
 */
export default function QuickAddShopping({ listSize }: { listSize: number }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !user) return;
    setName("");
    // A newly added item can fall outside the visible six (oldest first),
    // so confirm inline rather than resorting the list.
    setConfirmation(`Added ✓ · ${listSize + 1} on the list`);
    inputRef.current?.focus();
    await addShoppingItem(trimmed, user.uid);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <input
        ref={inputRef}
        className="ghost-input"
        type="text"
        value={name}
        placeholder={HOUSE.addPlaceholder}
        onChange={(e) => {
          setName(e.target.value);
          if (confirmation) setConfirmation("");
        }}
      />
      {confirmation && <p className="muted">{confirmation}</p>}
    </form>
  );
}
