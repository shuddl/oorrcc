// src/services/PromptEngineerAgent.ts
import { logger } from '../utils/logger';
import { componentPrompts } from '../config/prompts/component.prompts';
import { AIService } from './AIService';
import { RequirementCategory } from '../types/requirements.types';

/**
 * This interface holds the user/brand config used by the agent
 * to tailor prompts (industry, user type, design style, etc).
 */
export interface PromptEngineerConfig {
  industry?: string;       // e.g. "finance", "healthcare", etc.
  userType?: string;       // e.g. "corporate staff", "gamers", etc.
  designStyle?: string;    // e.g. "minimal", "loud + vibrant"
  brandColors?: string[];  // e.g. ["#FF0000", "#00FF00"]
  complexity?: 'basic' | 'moderate' | 'advanced';
  language?: 'TypeScript' | 'JavaScript';
}

/**
 * The persona type is used to pick specialized "prompt personalities"
 * that shape how code is generated.
 */
export type PersonaType =
  | 'sidebarGuru'
  | 'headerGuru'
  | 'contemporaryLoudDesigner'
  | 'ultraMinimalDesigner'
  | 'footerWizard'
  | 'dbArchitect'
  | 'securityAdvisor'
  | 'performanceHawk'
  // etc. Add more as needed

/**
 * The PromptEngineerAgent merges the global config + persona + custom module instructions
 * into a final prompt for the AI code generator (OpenAI, local LLM, etc.).
 */
export class PromptEngineerAgent {
  private aiService: AIService;

  constructor(private config: PromptEngineerConfig) {
    this.aiService = new AIService();
    logger?.debug?.('PromptEngineerAgent initialized', config);
  }

  /**
   * Provide a specialized prompt for a given "persona" + "moduleName" + optional user text.
   */
  public getPromptForModule(
    persona: PersonaType,
    moduleName: string,
    customPrompt?: string
  ): string {
    // Build a base prompt that references the user config + module name
    const basePrompt = this.generateBasePrompt(moduleName, customPrompt);

    switch (persona) {
      case 'sidebarGuru':
        return this.sidebarGuruPrompt(basePrompt);
      case 'headerGuru':
        return this.headerGuruPrompt(basePrompt);
      case 'contemporaryLoudDesigner':
        return this.loudDesignPrompt(basePrompt);
      case 'ultraMinimalDesigner':
        return this.minimalDesignPrompt(basePrompt);
      case 'footerWizard':
        return this.footerPrompt(basePrompt);
      case 'dbArchitect':
        return this.dbArchitectPrompt(basePrompt);
      case 'securityAdvisor':
        return this.securityPrompt(basePrompt);
      case 'performanceHawk':
        return this.performancePrompt(basePrompt);
      default:
        // fallback if no persona matched
        return basePrompt;
    }
  }

  /**
   * The standard text referencing user config (industry, userType, design style).
   */
  private generateBasePrompt(moduleName: string, customPrompt?: string): string {
    return `
You are generating a ${moduleName} for an application in the ${this.config.industry || 'general'} domain.
The end users are ${this.config.userType || 'unspecified user base'}, 
and the chosen design style is "${this.config.designStyle || 'classic'}". 
Complexity is set to ${this.config.complexity || 'moderate'}, 
and the preferred language is ${this.config.language || 'TypeScript'}.

${
  customPrompt
    ? `Additional instructions from user: ${customPrompt}`
    : ''
}

Please consider:
1) Best practices
2) Maintainability
3) Accessibility (WCAG)
4) Clean code with consistent naming
5) Minimal (or rich) styling as context demands
6) If brandColors are provided: ${this.config.brandColors?.join(', ') || 'none'}

---
`.trim();
  }

  private sidebarGuruPrompt(base: string): string {
    return `
${base}

Now focus on building a responsive, collapsible Sidebar. 
Incorporate brand colors if available. Provide placeholder nav items, submenus if complexity is "advanced." 
Ensure user type = ${this.config.userType} can navigate easily.
`.trim();
  }

  private headerGuruPrompt(base: string): string {
    return `
${base}

Design a dynamic header with brand presence, possibly a search bar, and user profile menu. 
Reflect industry = ${this.config.industry}. Keep it accessible and cohesive with the rest of the UI.
`.trim();
  }

  private loudDesignPrompt(base: string): string {
    return `
${base}

Create a future-forward, loud design with bold typography, bright color splashes, 
and creative transitions. It's crucial it remains usable and meets accessibility guidelines.
`.trim();
  }

  private minimalDesignPrompt(base: string): string {
    return `
${base}

Aim for ultra-minimal code + design. Rely on whitespace and subtle color use. 
Use minimal transitions or animations. 
No extraneous detail—just a clean, functional approach.
`.trim();
  }

  private footerPrompt(base: string): string {
    return `
${base}

You are creating a custom footer with relevant links (privacy, TOS, etc.). 
Possibly add social icons if brandColors exist. Keep it consistent with the chosen design style.
`.trim();
  }

  private dbArchitectPrompt(base: string): string {
    return `
${base}

This module requires database architectural changes. 
Focus on schema design, migrations, ensuring the new data flows are integrated 
with existing domain specifics. 
Consider indexing strategy for performance if complexity is advanced.
`.trim();
  }

  private securityPrompt(base: string): string {
    return `
${base}

Emphasize secure coding practices. Check for potential injection, 
XSS, or data leakage. 
Add relevant security checks or validations.
`.trim();
  }

  private performancePrompt(base: string): string {
    return `
${base}

Optimize for performance. 
Ensure minimal re-renders in React. 
Use memoization or code splitting if relevant. 
If data fetch is involved, cache or batch requests for efficiency.
`.trim();
  }

  /**
   * Generates code based on the provided requirements.
   * Ensures that the generated code does not use lazy loading or contain mock implementations.
   * @param requirements Array of RequirementCategory
   * @returns Generated code as a string
   */
  async generateCode(requirements: RequirementCategory[]): Promise<string> {
    try {
      const prompt = this.buildPrompt(requirements);
      
      const code = await this.aiService.generateComponent({
        name: 'GeneratedComponent',
        type: 'functional',
        description: 'A production-ready component without lazy loading or mock code.',
        features: [],
        styling: {
          framework: 'TailwindCSS',
          theme: {
            primaryColor: '#3490dc',
            secondaryColor: '#ffed4a',
          },
        },
        state: {
          type: 'useState',
          schema: {},
        },
        props: [],
        dependencies: [],
      });
      
      return code;
    } catch (error: any) {
      logger.error('PromptEngineerAgent failed to generate code', { error });
      throw new Error('Failed to generate code');
    }
  }

  /**
   * Builds the AI prompt with enforced constraints.
   * @param requirements Array of RequirementCategory
   * @returns Enhanced AI prompt as a string
   */
  private buildPrompt(requirements: RequirementCategory[]): string {
    let basePrompt = componentPrompts.base;

    // Insert constraints to prevent lazy loading and mock code
    const constraints = `
    **Constraints:**
    - Do not use lazy loading techniques in the component.
    - Do not include any mock implementations or placeholder code.
    - Ensure all code is production-ready with synchronous loading.
    - Validate all inputs and handle errors gracefully.
    - Maintain high performance and accessibility standards.
    `;

    return `${basePrompt}\n\n${constraints}\n\n${this.formatRequirements(requirements)}`;
  }

  /**
   * Formats the requirements into a structured prompt section.
   * @param requirements Array of RequirementCategory
   * @returns Formatted requirements as a string
   */
  private formatRequirements(requirements: RequirementCategory[]): string {
    return requirements.map(category => `
    **Category: ${category.name}**
    ${category.description}
    `).join('\n');
  }
}