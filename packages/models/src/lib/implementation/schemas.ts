import { ZodObject, ZodOptional, ZodString, z } from 'zod';
import { MATERIAL_ICONS, MaterialIcon } from '@code-pushup/portal-client';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_SLUG_LENGTH,
  MAX_TITLE_LENGTH,
} from './limits';
import { filenameRegex, slugRegex } from './utils';

/**
 * Schema for execution meta date
 */
export function executionMetaSchema(
  options: {
    descriptionDate: string;
    descriptionDuration: string;
  } = {
    descriptionDate: 'Execution start date and time',
    descriptionDuration: 'Execution duration in ms',
  },
) {
  return z.object({
    date: z.string({ description: options.descriptionDate }),
    duration: z.number({ description: options.descriptionDuration }),
  });
}

/**
 * Schema for a slug of a categories, plugins or audits.
 * @param description
 */
export function slugSchema(
  description = 'Unique ID (human-readable, URL-safe)',
) {
  return z
    .string({ description })
    .regex(slugRegex, {
      message:
        'The slug has to follow the pattern [0-9a-z] followed by multiple optional groups of -[0-9a-z]. e.g. my-slug',
    })
    .max(MAX_SLUG_LENGTH, {
      message: `slug can be max ${MAX_SLUG_LENGTH} characters long`,
    });
}

/**
 * Schema for a general description property
 * @param description
 */
export function descriptionSchema(description = 'Description (markdown)') {
  return z.string({ description }).max(MAX_DESCRIPTION_LENGTH).optional();
}

/**
 * Schema for a docsUrl
 * @param description
 */
export function docsUrlSchema(description = 'Documentation site') {
  return urlSchema(description).optional().or(z.string().max(0)); // allow empty string (no URL validation)
}

/**
 * Schema for a URL
 * @param description
 */
export function urlSchema(description: string) {
  return z.string({ description }).url();
}

/**
 * Schema for a title of a plugin, category and audit
 * @param description
 */
export function titleSchema(description = 'Descriptive name') {
  return z.string({ description }).max(MAX_TITLE_LENGTH);
}

/**
 * Used for categories, plugins and audits
 * @param options
 */
export function metaSchema(options?: {
  titleDescription?: string;
  descriptionDescription?: string;
  docsUrlDescription?: string;
  description?: string;
}) {
  const {
    descriptionDescription,
    titleDescription,
    docsUrlDescription,
    description,
  } = options ?? {};
  return z.object(
    {
      title: titleSchema(titleDescription),
      description: descriptionSchema(descriptionDescription),
      docsUrl: docsUrlSchema(docsUrlDescription),
    },
    { description },
  );
}

/**
 * Schema for a generalFilePath
 * @param description
 */
export function filePathSchema(description: string) {
  return z
    .string({ description })
    .trim()
    .min(1, { message: 'path is invalid' });
}

/**
 * Schema for a fileNameSchema
 * @param description
 */
export function fileNameSchema(description: string) {
  return z
    .string({ description })
    .trim()
    .regex(filenameRegex, {
      message: `The filename has to be valid`,
    })
    .min(1, { message: 'file name is invalid' });
}

/**
 * Schema for a positiveInt
 * @param description
 */
export function positiveIntSchema(description: string) {
  return z.number({ description }).int().nonnegative();
}

export function packageVersionSchema<TRequired extends boolean>(options?: {
  versionDescription?: string;
  required?: TRequired;
}) {
  const { versionDescription = 'NPM version of the package', required } =
    options ?? {};
  const packageSchema = z.string({ description: 'NPM package name' });
  const versionSchema = z.string({ description: versionDescription });
  return z.object(
    {
      packageName: required ? packageSchema : packageSchema.optional(),
      version: required ? versionSchema : versionSchema.optional(),
    },
    { description: 'NPM package name and version of a published package' },
  ) as ZodObject<{
    packageName: TRequired extends true ? ZodString : ZodOptional<ZodString>;
    version: TRequired extends true ? ZodString : ZodOptional<ZodString>;
  }>;
}

/**
 * Schema for a weight
 * @param description
 */
export function weightSchema(
  description = 'Coefficient for the given score (use weight 0 if only for display)',
) {
  return positiveIntSchema(description);
}

export function weightedRefSchema(
  description: string,
  slugDescription: string,
) {
  return z.object(
    {
      slug: slugSchema(slugDescription),
      weight: weightSchema('Weight used to calculate score'),
    },
    { description },
  );
}

export type WeightedRef = z.infer<ReturnType<typeof weightedRefSchema>>;

export function scorableSchema<T extends ReturnType<typeof weightedRefSchema>>(
  description: string,
  refSchema: T,
  duplicateCheckFn: (metrics: z.infer<T>[]) => false | string[],
  duplicateMessageFn: (metrics: z.infer<T>[]) => string,
) {
  return z.object(
    {
      slug: slugSchema('Human-readable unique ID, e.g. "performance"'),
      refs: z
        .array(refSchema)
        .min(1)
        // refs are unique
        .refine(
          refs => !duplicateCheckFn(refs),
          refs => ({
            message: duplicateMessageFn(refs),
          }),
        )
        // categories weights are correct
        .refine(hasWeightedRefsInCategories, () => ({
          message: `In a category there has to be at least one ref with weight > 0`,
        })),
    },
    { description },
  );
}

export const materialIconSchema = z.enum(
  MATERIAL_ICONS as [MaterialIcon, MaterialIcon, ...MaterialIcon[]],
  { description: 'Icon from VSCode Material Icons extension' },
);

type Ref = { weight: number };

function hasWeightedRefsInCategories(categoryRefs: Ref[]) {
  return categoryRefs.reduce((acc, { weight }) => weight + acc, 0) !== 0;
}
