# Taxonomy field matrix

This matrix describes the currently shipped canonical branches. Field IDs are
stable registry IDs; inherited fields are resolved from the root/ancestor and
node assignments. The exact resolved payload remains available through the
taxonomy service and shared contract.

| Root / family | Representative branches | Required or decision fields | Search / comparison examples | Card/detail guidance |
| --- | --- | --- | --- | --- |
| Véhicules / vehicle | cars, motos, cycles, parts | brand, model, year, mileage, fuel, gearbox | year, mileage, fuel, gearbox, emissions, engine displacement | 3–5 decision fields; vehicle media views |
| Immobilier / real_estate | sales, rentals, commercial, parking | property type, surface, rooms; rental amount for rentals | surface, rooms, energy class, monthly rent, parking | minimum 5 photos; group by property/legal/performance |
| Emploi / job | offers | contract type, sector, profession | contract, sector, telework, salary | no product condition; employment group |
| Services / service | home repairs, tutoring, events | billing/location mode plus subject or delivery mode | audience, delivery mode, travel radius, duration, languages | service/context photos; no product condition |
| Maison & Jardin / physical_product | furniture, appliances, DIY/garden | inherited product condition and core identity | brand, material, dimensions, weight | dimensions/material group; delivery depends on branch |
| Multimédia / physical_product | smartphones, computers, gaming, audio | brand/model plus branch-specific technical fields | storage, RAM, processor, OS, connectivity, invoice | concise technical card summary |
| Mode / physical_product | women, men, shoes, jewelry | gender and optional size/size system | size, fit, authenticity, condition | public authenticity/provenance fields |
| Bébé & Enfant / physical_product | strollers, toys | product condition and dimensions where applicable | condition, dimensions, accessories | safety-conscious details |
| Loisirs & Culture / physical_product | instruments, books | product condition; instrument type where applicable | instrument type, level, condition | item context and condition |
| Sports & Plein air / physical_product | fitness, outdoor | activity and size/dimensions | activity, size, condition | equipment context photos |
| Animaux / physical_product | pet accessories | species/age/breed/gender for pet branch; product identity for accessories | species, breed, age, condition | public-safe animal metadata |
| Matériel professionnel / professional_equipment | machinery, catering | product identity, operating hours/CE where relevant | operating hours, tonnage, CE | compliance/detail grouping |
| Matériel agricole / professional_equipment | tractors | brand, operating hours, power | hours, power, condition | machinery context and safety |
| Énergie & Transition / professional_equipment | solar, EV charging | installation type, compatibility | power, battery capacity, compatibility | installation/context views |
| IT & Télécom Pro / professional_equipment | servers and telecom | generation, connectivity, functional condition | generation, connectivity, invoice | technical/compliance detail |
| Dons & Solidarité / physical_product | donations/free items | condition and quantity when applicable | condition, quantity, accessories | no paid-price assumption |

## Attribute presentation semantics

- Required fields are blocking only when the dependency makes them visible.
- Recommended fields are optional but can be emphasized in the wizard.
- `filterable`, `sortable`, `comparable`, `searchable`, `seoRelevant` and
  `privacy` are independent flags; one must not be inferred from another.
- `displayPrefix` and `displayOptionLabels` keep buyer-facing summaries concise
  without changing the publication value or the option label used in forms.
- A listing stores canonical attribute codes and the taxonomy/schema version
  used to validate them.
