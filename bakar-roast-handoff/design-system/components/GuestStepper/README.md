A headcount stepper limited to the chosen package's guest range.

- Appears in booking step 2 after a package is chosen. The help line states the range ("The Feast serves 20 to 80 guests.").
- Minus disables at the minimum and plus at the maximum. Buttons are 44px circles; the value is announced with `aria-live`.
- You provide the package's minimum and maximum, the starting value and the step size. The preview steps by 5; allow typing an exact number on tap.
- Changing the package clamps the value into the new range and says so in the help line.
