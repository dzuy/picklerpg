# Controlled serve, return and soft-game checks

Other attributes stay at 70; the same seeds 0–1999 are reused. Serve pressure means a faster, flatter serve, not incoming-ball pressure. Other pressure cases use a low, stretched, rushed contact. Lob is included because it uses drop skill.

Legal counts exclude net/out faults and illegal service boxes. Target depth means legal kitchen landings for drop/dink/reset, or legal landings beyond 4.5 m for serve/return/lob. These are intended landing outcomes before interception, not rally wins or measures of whether a ball is attackable.

| Attribute | Skill | Shot | Contact | Legal | Target depth | Error (m) | Mishits |
|---|---:|---|---|---:|---:|---:|---:|
| serve | 30 | serve | prepared | 91.2% | 88.8% | 1.253 | 8.5% |
| serve | 30 | serve | pressure | 55.3% | 53.9% | 1.253 | 8.5% |
| serve | 30 | serve | wide | 58.3% | 56.6% | 1.253 | 8.5% |
| serve | 50 | serve | prepared | 94.8% | 94.4% | 0.865 | 5.9% |
| serve | 50 | serve | pressure | 62.8% | 62.7% | 0.865 | 5.9% |
| serve | 50 | serve | wide | 64.1% | 63.6% | 0.865 | 5.9% |
| serve | 70 | serve | prepared | 98.5% | 98.0% | 0.385 | 2.6% |
| serve | 70 | serve | pressure | 86.6% | 86.5% | 0.385 | 2.6% |
| serve | 70 | serve | wide | 81.3% | 81.0% | 0.385 | 2.6% |
| serve | 90 | serve | prepared | 100.0% | 100.0% | 0.126 | 0.9% |
| serve | 90 | serve | pressure | 99.7% | 99.7% | 0.126 | 0.9% |
| serve | 90 | serve | wide | 99.8% | 99.8% | 0.126 | 0.9% |
| return | 30 | return | prepared | 88.8% | 84.0% | 1.376 | 9.9% |
| return | 30 | return | pressure | 63.8% | 50.8% | 2.993 | 26.9% |
| return | 30 | return | wide | 56.5% | 53.0% | 1.376 | 9.9% |
| return | 50 | return | prepared | 95.2% | 94.1% | 0.943 | 6.9% |
| return | 50 | return | pressure | 77.5% | 70.5% | 2.005 | 20.8% |
| return | 50 | return | wide | 64.3% | 62.9% | 0.943 | 6.9% |
| return | 70 | return | prepared | 98.8% | 98.0% | 0.422 | 3.3% |
| return | 70 | return | pressure | 92.1% | 88.8% | 0.915 | 13.6% |
| return | 70 | return | wide | 79.3% | 78.9% | 0.422 | 3.3% |
| return | 90 | return | prepared | 100.0% | 100.0% | 0.138 | 1.1% |
| return | 90 | return | pressure | 98.8% | 97.2% | 0.314 | 9.5% |
| return | 90 | return | wide | 99.8% | 99.8% | 0.138 | 1.1% |
| drop | 30 | drop | prepared | 68.8% | 55.8% | 1.376 | 9.9% |
| drop | 30 | drop | pressure | 49.9% | 33.4% | 2.993 | 26.9% |
| drop | 30 | drop | wide | 43.5% | 35.1% | 1.376 | 9.9% |
| drop | 30 | lob | prepared | 89.0% | 84.0% | 1.376 | 9.9% |
| drop | 30 | lob | pressure | 64.6% | 50.9% | 2.993 | 26.9% |
| drop | 30 | lob | wide | 56.7% | 53.0% | 1.376 | 9.9% |
| drop | 50 | drop | prepared | 79.5% | 76.4% | 0.943 | 6.9% |
| drop | 50 | drop | pressure | 58.9% | 45.1% | 2.005 | 20.8% |
| drop | 50 | drop | wide | 53.3% | 50.5% | 0.943 | 6.9% |
| drop | 50 | lob | prepared | 95.3% | 94.1% | 0.943 | 6.9% |
| drop | 50 | lob | pressure | 78.3% | 70.6% | 2.005 | 20.8% |
| drop | 50 | lob | wide | 64.5% | 62.9% | 0.943 | 6.9% |
| drop | 70 | drop | prepared | 98.9% | 97.6% | 0.422 | 3.3% |
| drop | 70 | drop | pressure | 83.1% | 79.1% | 0.915 | 13.6% |
| drop | 70 | drop | wide | 79.3% | 78.6% | 0.422 | 3.3% |
| drop | 70 | lob | prepared | 98.8% | 98.0% | 0.422 | 3.3% |
| drop | 70 | lob | pressure | 92.1% | 88.8% | 0.915 | 13.6% |
| drop | 70 | lob | wide | 79.3% | 78.9% | 0.422 | 3.3% |
| drop | 90 | drop | prepared | 99.9% | 99.7% | 0.138 | 1.1% |
| drop | 90 | drop | pressure | 96.9% | 94.7% | 0.314 | 9.5% |
| drop | 90 | drop | wide | 99.7% | 99.6% | 0.138 | 1.1% |
| drop | 90 | lob | prepared | 100.0% | 100.0% | 0.138 | 1.1% |
| drop | 90 | lob | pressure | 98.8% | 97.2% | 0.314 | 9.5% |
| drop | 90 | lob | wide | 99.8% | 99.8% | 0.138 | 1.1% |
| dink | 30 | dink | prepared | 67.5% | 54.8% | 1.376 | 9.9% |
| dink | 30 | dink | pressure | 42.6% | 28.4% | 2.814 | 25.8% |
| dink | 30 | dink | wide | 42.8% | 34.5% | 1.376 | 9.9% |
| dink | 50 | dink | prepared | 78.2% | 75.7% | 0.943 | 6.9% |
| dink | 50 | dink | pressure | 54.6% | 42.1% | 1.899 | 20.1% |
| dink | 50 | dink | wide | 52.8% | 50.4% | 0.943 | 6.9% |
| dink | 70 | dink | prepared | 98.8% | 97.6% | 0.422 | 3.3% |
| dink | 70 | dink | pressure | 77.0% | 74.4% | 0.862 | 13.1% |
| dink | 70 | dink | wide | 79.3% | 78.6% | 0.422 | 3.3% |
| dink | 90 | dink | prepared | 99.9% | 99.7% | 0.138 | 1.1% |
| dink | 90 | dink | pressure | 96.2% | 94.3% | 0.298 | 9.4% |
| dink | 90 | dink | wide | 99.7% | 99.6% | 0.138 | 1.1% |
| reset | 30 | reset | prepared | 68.8% | 55.8% | 1.376 | 9.9% |
| reset | 30 | reset | pressure | 49.9% | 33.4% | 2.993 | 26.9% |
| reset | 30 | reset | wide | 43.5% | 35.1% | 1.376 | 9.9% |
| reset | 50 | reset | prepared | 79.5% | 76.4% | 0.943 | 6.9% |
| reset | 50 | reset | pressure | 58.9% | 45.1% | 2.005 | 20.8% |
| reset | 50 | reset | wide | 53.3% | 50.5% | 0.943 | 6.9% |
| reset | 70 | reset | prepared | 98.9% | 97.6% | 0.422 | 3.3% |
| reset | 70 | reset | pressure | 83.1% | 79.1% | 0.915 | 13.6% |
| reset | 70 | reset | wide | 79.3% | 78.6% | 0.422 | 3.3% |
| reset | 90 | reset | prepared | 99.9% | 99.7% | 0.138 | 1.1% |
| reset | 90 | reset | pressure | 96.9% | 94.7% | 0.314 | 9.5% |
| reset | 90 | reset | wide | 99.7% | 99.6% | 0.138 | 1.1% |

## Dink-start rallies

The same wide dink starts each existing practice setup, followed by normal auto-play. Only home dink skill varies; all other skills and opponents stay at 70. Seeds 10000–10199. Home always starts, so compare ratings within each drill rather than interpreting 50% as the expected baseline. This is targeted exposure, not ordinary match frequency.

| Setup | Dink | Completed | Home rally wins | Opening faults |
|---|---:|---:|---:|---:|
| wide | 50 | 200/200 | 22.5% | 54.0% |
| behind | 50 | 200/200 | 24.5% | 54.0% |
| wide | 70 | 200/200 | 41.5% | 27.0% |
| behind | 70 | 200/200 | 41.5% | 27.0% |
| wide | 90 | 200/200 | 60.0% | 0.0% |
| behind | 90 | 200/200 | 58.5% | 0.0% |