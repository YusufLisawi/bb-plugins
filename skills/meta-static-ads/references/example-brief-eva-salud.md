# Brief: stock-style AI photos for Eva Salud Meta ads

You are generating **photorealistic background photos** for static Meta ads (1080×1350, 4:5 portrait) for **Eva Salud**, a Spanish health app (video consultations, specialists, dental, aesthetics, booking appointments with AI, medical consultations included in a subscription).

Use your image generation tool. Generate every image below. Generating several variations per prompt is welcome — keep the best one under the exact filename, and store extra good variations as `<name>-v2.png`, `<name>-v3.png`.

**Save all final files to:** `/tmp/evaads/site/img/ai/` (PNG or JPG, the exact filenames below).

## Global style (apply to EVERY prompt)
- Must look like a premium, real **editorial stock photograph**, not AI: shot on a full-frame camera (e.g. Sony A7R V, 35mm or 50mm lens, f/1.8–f/2.8), natural light, true skin texture with pores and small imperfections, natural hair flyaways, correct anatomy, **perfect hands (five fingers, natural grip)**, realistic eyes and teeth, no plastic/waxy skin, no over-smoothing, no HDR look, no oversaturation.
- People: **Spanish / Mediterranean** looks, varied ages, natural and relatable (not models-perfect), casual real clothing.
- Setting: contemporary Spain — bright homes with white walls, light wood, plants, terracotta, sunlight; modern clean clinics.
- Palette leans soft/neutral with gentle touches of green (brand green #00983a) or navy (#232263) in clothes/props where natural. Avoid red/orange dominance.
- **NO text, NO logos, NO brand names, NO watermarks, NO readable UI on screens** (screens may show a blurred video call with a doctor's face, never words).
- **Vertical 4:5 portrait** (or taller, e.g. 1024×1536). Leave **clean negative space** where noted so ad text can sit on top.

## Images to create

1. `medica-tablet.png` — Friendly female doctor, late 30s, white coat over navy scrubs, stethoscope, holding a tablet, warm genuine smile looking at camera, bright modern Spanish clinic softly blurred behind. Subject in the lower 65% of frame; **clean soft background in the top 35%**.

2. `madre-bebe-noche.png` — Young mother at home at night in a softly lit living room, holding her baby (about 1 year old) on her lap, doing a video call on her phone with a pediatrician (blurred doctor on screen, no text). Warm lamp light, calm reassurance on her face. **Dark calm space at the top**.

3. `padre-hijo-fiebre.png` — Father (40s) sitting on a sofa with his 6-year-old son wrapped in a blanket, slightly unwell, digital thermometer on the coffee table, father holding a phone and looking relieved. Soft daylight. **Negative space on the right side / top**.

4. `abuela-nieta-movil.png` — Grandmother (70s) and her granddaughter (20s) sitting close together on a sunny Mediterranean terrace with plants, the granddaughter showing her how to book an appointment on a phone, both smiling naturally. **Open sky/wall space in the top third**.

5. `embarazada-sofa.png` — Pregnant woman (early 30s), visibly in her third trimester, relaxed on a light linen sofa, hand on her belly, looking at her phone with a gentle smile. Bright airy apartment, plants. **Negative space on the left**.

6. `fisio-hombre.png` — Man in his 40s during a physiotherapy session for his shoulder in a bright modern physio clinic; female physiotherapist in a dark green polo guiding the movement. Authentic, candid, not posed. **Clean wall space in the top third**.

7. `runner-parque.png` — Woman in her 30s after a morning run in a Madrid-style park (Retiro-like trees), sportswear with a green accent, checking her phone and smiling, golden-hour backlight. **Soft blurred space at the top**.

8. `psicologia-online.png` — Man in his early 30s at home, sitting at a wooden table by a window with a laptop, in a calm online therapy session (therapist blurred on screen), relaxed and open expression, cup of tea. Soft morning light. **Negative space on the left/top**.

9. `dermatologa-consulta.png` — Female dermatologist examining the forearm skin of a woman in her 40s with a dermatoscope in a bright, clean clinic. Both calm. **Space at the top**.

10. `pareja-mayor-cocina.png` — Senior couple (late 60s) cooking a colorful healthy Mediterranean meal together in a sunlit kitchen (tomatoes, greens, olive oil), laughing. **Clean space in the top third**.

11. `nino-dentista.png` — Boy (8) in a dental chair giving a thumbs up, female dentist with mask pulled down smiling at him, mother standing beside him. Bright modern dental clinic, soft pastel tones. **Space at the top**.

12. `mujer-cama-movil.png` — Woman in her late 20s in bed in the morning, a bit unwell (tissues on the nightstand), in a video call on her phone with a doctor, cozy neutral bedding, window light. **Negative space at the top**.

## Finish
- Review each image critically for AI artefacts (hands, eyes, teeth, text-like gibberish, warped backgrounds). Regenerate anything that is not believable as a real photograph.
- When done, write `/tmp/evaads/site/img/ai/MANIFEST.md` listing each file, one line describing it, and where the negative space is.
- Do not edit `/tmp/evaads/site/index.html`. Report back a short summary with the list of files.
