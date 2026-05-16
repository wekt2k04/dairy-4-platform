# IoT Hardware Integration

## Current demo path

`scripts/iot_simulator.py` generates realistic telemetry and writes it to Firestore every N seconds.

## Turning the simulator off

- Stop running the script.
- Remove any startup job that launches it.
- Keep the Firestore record shape, but replace the sample generator with hardware input.

## Suggested hardware layout

- **Arduino / ESP32**: capture raw sensors such as temperature, heart rate proxy, rumen pH, and motion.
- **Raspberry Pi**: aggregate the stream, timestamp it, and publish to the backend or directly to Firestore through Admin SDK.

## Field mapping to preserve

Keep the same essential payload keys:

- `temperature_c`
- `heart_rate_bpm`
- `rumen_ph`
- `activity_score`
- `milk_yesterday_liters`
- `time_of_day_hhmm`

Optional metadata that is safe to add:

- `cow_id`
- `device_id`
- `battery_voltage`
- `signal_strength`
- `firmware_version`

## Recommended production path

1. Hardware node reads sensors.
2. Gateway normalizes values into the same schema as the simulator.
3. Gateway writes a Firestore document or posts to the backend.
4. Backend keeps health and production inference independent.
5. Vision remains optional and only runs when a video is provided.

## Operational notes

- Use UTC timestamps.
- Keep intervals consistent with the farm telemetry cadence.
- Validate ranges before writing to Firestore.
- Never let hardware outages block the health or production pipeline.
