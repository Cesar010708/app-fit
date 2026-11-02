import { FoodAnalysis } from './types';

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export async function analyzeFoodPhoto(base64Image: string): Promise<FoodAnalysis> {
  if (!API_KEY) throw new Error('Falta EXPO_PUBLIC_OPENAI_API_KEY en tu .env');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: `Eres nutricionista experto en analisis visual de alimentos. Identifica CADA ingrediente visible por separado con sus macros por unidad. Reglas:
- Distingue bien los alimentos: papaya (pulpa naranja suave) vs pimiento (piel brillante)
- Si no hay aceite visible, asume coccion sin aceite
- Da los macros POR UNIDAD del ingrediente (por huevo, por rebanada, por 100g, etc.)
- Estima la cantidad que ves en el plato`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' },
            },
            {
              type: 'text',
              text: `Analiza cada ingrediente visible. Devuelve SOLO este JSON:
{
  "name": "nombre del plato completo",
  "description": "descripcion breve",
  "ingredients": [
    {
      "name": "Huevo frito",
      "unit": "unidad",
      "quantity": 2,
      "cal_per_unit": 78,
      "protein_per_unit": 6,
      "carbs_per_unit": 1,
      "fat_per_unit": 5
    },
    {
      "name": "Aguacate",
      "unit": "mitad",
      "quantity": 1,
      "cal_per_unit": 120,
      "protein_per_unit": 1,
      "carbs_per_unit": 6,
      "fat_per_unit": 11
    }
  ]
}
Solo el JSON.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).error?.message || `Error ${response.status}`);
  }

  const data = await response.json();
  const text: string = data.choices[0].message.content;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No se pudo interpretar el analisis');

  const parsed = JSON.parse(match[0]);

  // Compatibilidad: si la IA devuelve formato antiguo (sin ingredients), adaptarlo
  if (!parsed.ingredients) {
    return {
      name: parsed.name || 'Comida',
      description: parsed.description || '',
      ingredients: [{
        name: parsed.name || 'Comida',
        unit: 'porcion',
        quantity: 1,
        cal_per_unit: parsed.calories || 0,
        protein_per_unit: parsed.protein || 0,
        carbs_per_unit: parsed.carbs || 0,
        fat_per_unit: parsed.fat || 0,
      }],
    };
  }

  return parsed as FoodAnalysis;
}
