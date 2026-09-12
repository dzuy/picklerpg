# Intent-driven trajectories — Step 6

Both Shot lab and the default guided rally now use `generateTrajectory` in `src/engine/trajectory.ts`. It consumes a validated canonical intent, contact context and player state, then returns the resolved aim point, generated flight leg, peak height and actual net clearance. No random or skill-based error is applied yet.

## Try it

Open **Practice → Shot lab**, expand **Flight intent**, and compare Soft versus Fast pace, Flat versus Arc, and different requested net clearances. The flight guide and readouts update before playback. The same endpoint remains selected while pace/shape change. Overhead + Descending + excessive clearance may be unavailable: the UI explains why instead of silently switching shape.

## Deterministic mapping

- Family supplies a baseline horizontal travel speed and lift.
- Target resolution supplies a ground landing or elevated contact point.
- Pace scales baseline speed: soft 0.7, medium 1, fast 1.3.
- Tactical purpose adjusts commitment: advance 0.9, neutralize 0.8, sustain 1, pressure 1.05, finish 1.1.
- Aggression applies a small speed factor from 0.9 to 1.1. This is desired execution, not execution variance.
- Shape supplies lift: flat uses 0.35 × family lift, arc 1.3 × family lift, descending requests zero lift.
- The generator raises lift only enough to satisfy the requested clearance, with a 0.06 m minimum center-height margin. A request for a descending path is rejected if meeting that clearance would require an initially rising shot.
- Duration has a 0.22 s readability floor. Peak height and actual clearance are calculated from the resulting curve, not copied from requested values.
- Source is provenance only. Identical intents from menu, voice or AI have identical execution.

These are prototype tuning constants rather than aerodynamics or calibrated pickleball speeds. Tactical purpose does not silently change the chosen target. Some flat requests need additional arc to clear the net; actual trajectory metrics make this visible. Skill ratings, contact difficulty, balance, fatigue and controlled randomness remain Step 7/later work.

## Guided-rally integration

`src/scenarios/generated-pressure.ts` keeps the five-shot tactical policy and now uses Step 8 automatic positioning, but generates every flight from intent and current contact/player state. Serve and return append a simple generated rebound, allowing the required two bounces. Drive and block are interrupted at scenario-selected receiver planes. `interceptFlight` slices the original parabola exactly, preserving both shape and elapsed time; contact positions are derived from those slices. The weak block uses a deep intended destination and is intercepted high in transition for the overhead.

Receiver selection, the pop-up response and winner remain guided policy; movement destinations use the positioning planner. This is not an unscripted point or generalized interception system. The old authored `pressure-middle.ts` fixture remains as a regression reference; its stored flight legs do not drive the default game. The generated provider reuses its presentation/intent templates, not its animation paths.

## Validation

Tests cover pace/shape/tactic/aggression changes, target preservation, clearance and apex calculation, deterministic source equivalence, impossible descending requests, exact interception slicing, and a complete generated rally through two bounces, third/overhead decision pauses, point completion and reset. Original authored-rally regression tests are retained explicitly against the legacy provider.
