# Ramadan Template – Detailed Prompts & Text per Scene

For each scene: the **full prompt** sent to the image model, and the **story text** that appears on the image. `{STYLE_INSTRUCTION}` is replaced at runtime with the chosen style (semi-realistic, 3D animation, or vector art). `{{name}}`, `{{pronoun}}`, etc. are replaced with the child's name and pronouns.

---

## Quick Cover Preview (Ramadan kids)

When the user selects the **Ramadan** kids template and uses **Quick Cover Preview**, the app uses the **same** front-cover scene as the full story (no separate Gemini “cover plan” call). So the Quick Cover is aligned with the story.

**Prompting structure:**

1. **Source of the cover:** `buildRamadanStoryPlan(userInput).scenes[0]` — i.e. the fixed Ramadan front cover from `ramadanTemplate.ts` (same title and image prompt as the real book).
2. **Title on cover:** Resolved per language from `COVER_TITLE` with `{{name}}` → child’s name, e.g.  
   - French: `{{name}} et les Valeurs du Ramadan`  
   - English: `{{name}} and the Values of Ramadan`  
   - Arabic: `{{name}} وقيم رمضان`  
   - Spanish: `{{name}} y los Valores del Ramadán`
3. **Image prompt:** The Front Cover prompt below, with `[TITLE_PLACEHOLDER]` replaced by the resolved title and `{STYLE_INSTRUCTION}` by the user’s chosen style.
4. **Image generation:** Same pipeline as the main story: `generateSceneImage(coverScene, quickCoverStyle, userInput.photoBase64, …)` with logo and face consistency.

---

## Front Cover

**Full prompt:**
```
{STYLE_INSTRUCTION} COMPOSITION: A warm, welcoming scene for a children's book. The Main Character (a child) is the ONLY person in the frame, standing or sitting in the center. SETTING: Use a MODERN, CONTEMPORARY home—e.g. clean living room, bright modern kitchen, or minimal indoor space with simple furniture and neutral or soft walls. Avoid stereotypical or overly ornate décor; the Ramadan touch comes from the ftour table and soft, warm lighting, not from clichéd patterns or props. On the SIDES of the frame (left and/or right), show a Moroccan ftour table: Moroccan tabla with harira in a zlafa, chbakia, dates, a glass of water, Moroccan pancakes (msemen or baghrir)—elegant and inviting, not cluttered. Background: subtle, contemporary; soft natural or warm indoor light; no heavy ornamentation. No other people. TEXT PLACEMENT: The title text must be placed on a CLEAN, UNCLUTTERED area (e.g. above or below the child). Leave natural negative space for the text. CHARACTERS: Only "The Main Character" (the child from the reference photo), facing the camera, in comfortable modest clothing. Only the main character (the child) must appear; no other people or faces in the scene. LOGO PLACEMENT: Space at the bottom center for the logo. TYPOGRAPHY: Soft rounded sans-serif – warm, friendly, child-appropriate and highly readable. The text must contrast with the background. HEADLINE TEXT: [TITLE_PLACEHOLDER]
```

**Text on image:** The cover title, e.g. "{{name}} and the Values of Ramadan" (or "{{name}} et les Valeurs du Ramadan", etc. depending on language).

---

## Scene 1 – Preparing for Ramadan

**Full prompt:**
```
you are a professional digital illustrator. STYLE: {STYLE_INSTRUCTION}.
COMPOSITION RULE: STRICT SIDE-BY-SIDE LAYOUT.
- The Main Character (the child) on the RIGHT side. Uncluttered background on the LEFT side for text (e.g. open sky, soft wall, distant landscape). Do NOT use plain white/black.
- CENTER SAFETY: The exact vertical center (50%) is the book spine. Do NOT place important faces or text here.
CHARACTER SAFETY: Use a WIDE SHOT (Medium-Long Shot). Leave margin around the character's head and arms. Do NOT cut off at the edge.
Scene: A child in a room at home with a calendar on the wall and gentle dawn light through the window. Warm, hopeful mood. The child is the only person visible.
Only the main character (the child) must appear; no other people or faces in the scene.
LAYOUT: Seamless continuous background across the entire width.
TEXT PLACEMENT: Place the text in the uncluttered area, away from the spine and edges. TYPOGRAPHY: Soft rounded sans-serif – warm, friendly, child-appropriate and highly readable. Do NOT use cursive or fancy fonts.
TEXT: [story text below]
```

**Text on image:**
```
Ramadan is almost here! {{name}} looks at the calendar and counts the days with joy. This month we fast, reflect and try our best to be kind. {{pronounCap}} has decided to live this adventure with a sincere heart. {{name}} learned that starting with a good intention is already a beautiful step.
```

---

## Scene 2 – Moon and calendar

**Full prompt:** Same structure as Scene 1. Character on RIGHT. Scene description:
```
Scene: A child on a balcony or by a large window at night, the crescent moon visible in the sky. Calm, hopeful mood. Only the child in frame.
```

**Text on image:**
```
{{name}} learned that Ramadan follows the moon. Each evening {{pronoun}} looks for the crescent in the sky. When we see it, a new day of fasting begins. {{pronounCap}} loves this waiting and counts the days until Eid. {{name}} feels part of something bigger.
```

---

## Scene 3 – First suhoor

**Full prompt:** Same structure. Character on LEFT. Scene description:
```
Scene: A child in a kitchen or dining nook at NIGHT TIME, moments before sunrise (pre-dawn suhoor). The table is set in Moroccan style: a Moroccan tabla (round metal tray), dates in a small bowl, water, chbakia or other Moroccan pastries, mint tea optional. Soft, dim pre-dawn lighting—one warm lamp or candlelight, dark blue/navy through the window, no bright daylight. Peaceful, intimate atmosphere. The child is the only person in the scene.
```

**Text on image:**
```
This morning {{name}} woke up before the sun for suhoor, the early meal we share with family before we fast. {{pronounCap}} had dates and water. {{name}} said thank you in {{pronounPossessive}} heart for this meal and for the chance to live this month. {{pronounCap}} learned that gratitude makes every bite more precious.
```

---

## Scene 4 – First iftar

**Full prompt:** Character on RIGHT. Scene description:
```
Scene: A child in a dining area at dusk, table set for iftar in Moroccan style: Moroccan tabla (round metal tray), dates in a bowl, water, chbakia (honey-sesame cookies), mint tea in a teapot with glasses, optional harira or pastries. Warm evening light. The child is alone at the table, smiling, as if about to break the fast. Only the child in frame.
```

**Text on image:**
```
The sun sets. It's time for iftar! {{name}} broke the fast with a date and water, the way we do with family. {{pronounCap}} felt joy and gratitude after a day of patience. {{name}} understood that being thankful for this moment fills the heart with peace.
```

---

## Scene 5 – Patience during the day

**Full prompt:** Character on RIGHT. Scene description:
```
Scene: A child in a garden, on a park bench, or in a sunny backyard in the daytime. Calm, patient expression. Only the child in frame.
```

**Text on image:**
```
In the middle of the day {{name}} sometimes feels thirsty or hungry. That's part of fasting. {{pronounCap}} chooses patience and thinks of those who don't always have enough to eat. {{name}} learned that patience makes the heart stronger and brings us closer to others.
```

---

## Scene 6 – Quiet moment

**Full prompt:** Character on LEFT. Scene description:
```
Scene: A child in a reading nook or on a window seat, soft light, peaceful and reflective pose. Calm mood. Only the child in frame.
```

**Text on image:**
```
Sometimes {{name}} sits quietly to think. During Ramadan we take time to say thank you and to think about what matters. {{pronounCap}} closes {{pronounPossessive}} eyes and feels peace in {{pronounPossessive}} heart. {{name}} learned that these quiet moments help keep the heart light.
```

---

## Scene 7 – Helping at home

**Full prompt:** Character on RIGHT. Scene description:
```
Scene: A child in a kitchen or hallway, setting the table or holding dishes. Helpful, gentle pose. Only the child visible.
```

**Text on image:**
```
{{name}} helps at home during Ramadan: setting the table, tidying {{pronounPossessive}} room. These are small gestures that bring joy to the people we love. {{pronounCap}} learned that helping with a kind heart is a beautiful way to show we care.
```

---

## Scene 8 – Family moments

**Full prompt:** Character on LEFT. Scene description:
```
Scene: A child in a living room with cushions and a warm lamp, evening atmosphere. Peaceful. Only the child is visible.
```

**Text on image:**
```
During Ramadan evenings, {{name}} loves quiet moments at home. Sometimes we read, sometimes we talk. {{pronounCap}} learns to listen and to be present. {{name}} understood that these moments with the people we love are a real treasure.
```

---

## Scene 9 – Reading and learning

**Full prompt:** Character on LEFT. Scene description:
```
Scene: A child at a small desk or in a library corner with books, curious and focused. Learning mood. Only the child in frame.
```

**Text on image:**
```
{{name}} loves to read and learn during Ramadan. Stories, kind words, things about this special month. {{pronounCap}} asks questions and grows by understanding more. {{name}} learned that wanting to understand is a beautiful value.
```

---

## Scene 10 – Giving and sharing

**Full prompt:** Character on RIGHT. Scene description:
```
Scene: A child on a porch or at the doorstep with a small basket or gift to give. Kind, generous mood. Only the child is visible.
```

**Text on image:**
```
During Ramadan, {{name}} learns to give. Giving a little of what we have, or our time, or a smile, is sadaqa. {{pronounCap}} prepared a small gesture for someone. {{name}} understood that sharing makes the heart light and that every gesture counts.
```

---

## Scene 11 – Sharing with others

**Full prompt:** Character on LEFT. Scene description:
```
Scene: A child on a garden path or front step with a bag or basket to give. Kind, generous expression. Only the child in frame.
```

**Text on image:**
```
{{name}} prepared a small gift for someone. Giving, even a little, makes the heart light. {{pronounCap}} knows that sadaqa can be a smile, a kind gesture or a thoughtfulness, not only money. {{name}} learned that kindness is a treasure.
```

---

## Scene 12 – Ramadan evenings

**Full prompt:** Character on RIGHT. Scene description:
```
Scene: A child on a balcony or by a window with evening lights, peaceful night mood. Only the child in frame.
```

**Text on image:**
```
In the evening, after iftar, the mood is gentle. {{name}} loves these moments when night falls and everything is calm. {{pronounCap}} feels close to the people {{pronoun}} loves. {{name}} learned to be thankful for these precious evenings.
```

---

## Scene 13 – Halfway through Ramadan

**Full prompt:** Character on LEFT. Scene description:
```
Scene: A child in a sunny bedroom or on a window seat, gentle daylight, hopeful and proud expression. Mid-Ramadan mood. Only the child in frame.
```

**Text on image:**
```
We're halfway through Ramadan! {{name}} is proud of {{pronounPossessive}} efforts. {{pronounCap}} has fasted, shared and reflected. {{name}} keeps going with a full heart toward Eid. {{pronounCap}} learned that perseverance is a strength.
```

---

## Scene 14 – Last days / Laylat al-Qadr

**Full prompt:** Character on LEFT. Scene description:
```
Scene: A child by a window or in a quiet spot at night, stars visible, gentle and hopeful. Last days of Ramadan. Only the child in frame.
```

**Text on image:**
```
We are in the last days of Ramadan. {{name}} has heard about the Night of Power, such a precious night. {{pronounCap}} keeps hope and gratitude in {{pronounPossessive}} heart. {{name}} learned that believing in these special moments fills the heart with light.
```

---

## Scene 15 – Eid

**Full prompt:** Character on RIGHT. Scene description:
```
Scene: A child on the front step or in the yard in morning light, in festive but modest clothing, smiling and ready for Eid. Joyful. Only the child in frame.
```

**Text on image:**
```
Ramadan has ended. It's Eid morning! {{name}} woke up with a light heart. {{pronounCap}} put on {{pronounPossessive}} best clothes and is ready to celebrate. After a month of patience, sharing and gratitude, joy is here. {{name}} learned that every effort made with the heart leads to joy.
```

---

## Back Cover

**Full prompt:**
```
Design a clean, elegant Back Cover. COMPOSITION: TOP AREA: Uncluttered background. Render this EXACT text at the top. TYPOGRAPHY: Soft rounded sans-serif – warm, friendly, child-appropriate and highly readable. Text: "{{SYNOPSIS}}" CENTER AREA: Only The Main Character (the child from the reference photo), front view, facing the camera, waving goodbye or smiling warmly. Only the main character (the child) must appear; no other people or faces in the scene. BOTTOM AREA: Leave uncluttered or minimal space for a logo; do NOT add any other text or brand message.
```

**Text on image:** The full synopsis, e.g. (English):
```
{{name}} lives Ramadan from start to Eid: a sincere intention, the moon and the calendar, first suhoor and iftar, patience and gratitude, quiet moments of reflection, helping and family time, reading and learning, giving and sadaqa, peaceful evenings, the halfway point, the last days and the Night of Power, then the joy of Eid. A heartwarming story where {{pronoun}} discovers the values of this month with an open heart.
```
