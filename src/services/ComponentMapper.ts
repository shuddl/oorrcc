import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { logger } from '../utils/logger';

interface ApiMapping {
  componentName: string;
  endpoints: Array<{
    path: string;
    method: string;
    parameters: string[];
    returnType: string;
  }>;
}

interface UpdateRequirement {
  componentName: string;
  requiredChanges: string[];
  severity: 'high' | 'medium' | 'low';
}

export class ComponentMapper {
  private mappings: Map<string, ApiMapping> = new Map();

  async generateApiMappings(components: Record<string, string>): Promise<Map<string, ApiMapping>> {
    try {
      for (const [name, code] of Object.entries(components)) {
        const endpoints = await this.extractApiEndpoints(code);
        if (endpoints.length > 0) {
          this.mappings.set(name, {
            componentName: name,
            endpoints: await Promise.all(endpoints.map(async endpoint => ({
              path: endpoint,
              method: this.extractHttpMethod(code, endpoint),
              parameters: await this.extractParameters(code, endpoint),
              returnType: await this.extractReturnType(code, endpoint)
            })))
          });
        }
      }
      return this.mappings;
    } catch (error) {
      logger.error('Error generating API mappings', { error });
      throw error;
    }
  }

  private async extractApiEndpoints(code: string): Promise<string[]> {
    const endpoints: string[] = [];
    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });

      traverse(ast, {
        CallExpression(path) {
          if (
            path.node.callee.type === 'MemberExpression' &&
            ['get', 'post', 'put', 'delete'].includes(path.node.callee.property.name)
          ) {
            const firstArg = path.node.arguments[0];
            if (firstArg && firstArg.type === 'StringLiteral') {
              endpoints.push(firstArg.value);
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error extracting API endpoints', { error });
    }
    return endpoints;
  }

  private extractHttpMethod(code: string, path: string): string {
    const methodRegex = new RegExp(`(get|post|put|delete)\\s*\\(['"\`]${path}['"\`]`);
    const match = code.match(methodRegex);
    return match ? match[1].toUpperCase() : 'GET';
  }

  private async extractParameters(code: string, path: string): Promise<string[]> {
    const parameters: string[] = [];
    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });

      traverse(ast, {
        FunctionDeclaration(path) {
          path.node.params.forEach(param => {
            if (param.type === 'Identifier') {
              parameters.push(param.name);
            }
          });
        }
      });
    } catch (error) {
      logger.error('Error extracting parameters', { error });
    }
    return parameters;
  }

  private async extractReturnType(code: string, path: string): Promise<string> {
    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });

      let returnType = 'any';
      traverse(ast, {
        TSTypeAnnotation(path) {
          if (path.node.typeAnnotation.type === 'TSTypeReference') {
            returnType = path.node.typeAnnotation.typeName.name;
          }
        }
      });
      return returnType;
    } catch (error) {
      logger.error('Error extracting return type', { error });
      return 'any';
    }
  }

  async detectRequiredUpdates(
    components: Record<string, string>,
    apiSpec: Record<string, unknown>
  ): Promise<UpdateRequirement[]> {
    const updates: UpdateRequirement[] = [];
    const mappings = await this.generateApiMappings(components);

    for (const [name, mapping] of mappings.entries()) {
      const componentUpdates: string[] = [];
      mapping.endpoints.forEach(endpoint => {
        if (!this.validateEndpoint(endpoint, apiSpec)) {
          componentUpdates.push(
            `Update endpoint ${endpoint.path} to match API specification`
          );
        }
      });

      if (componentUpdates.length > 0) {
        updates.push({
          componentName: name,
          requiredChanges: componentUpdates,
          severity: componentUpdates.length > 2 ? 'high' : 'medium'
        });
      }
    }

    return updates;
  }

  private validateEndpoint(
    endpoint: ApiMapping['endpoints'][0],
    apiSpec: Record<string, unknown>
  ): boolean {
    // Compare endpoint against API specification
    const specPath = Object.keys(apiSpec).find(path => 
      path.replace(/\{.*?\}/g, '*') === endpoint.path.replace(/:.+?(?=\/|$)/g, '*')
    );

    if (!specPath) return false;

    const spec = apiSpec[specPath];
    if (!spec || typeof spec !== 'object') return false;

    // Validate method, parameters, and return type
    return true; // Simplified for brevity, implement actual validation logic
  }
}
