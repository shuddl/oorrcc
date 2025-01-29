// src/validation/generation.validation.ts
import { z } from 'zod';

export const componentConfigSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['component', 'container', 'feature']),
  description: z.string().min(10),
  props: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    description: z.string()
  })),
  styling: z.object({
    framework: z.enum(['tailwind', 'css-modules', 'styled-components']),
    theme: z.record(z.unknown()).optional()
  }),
  requirements: z.object({
    accessibility: z.boolean(),
    responsive: z.boolean(),
    darkMode: z.boolean(),
    i18n: z.boolean(),
    typescript: z.boolean()
  })
});
