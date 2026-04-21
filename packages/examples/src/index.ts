/** File names of bundled samples (relative to the `samples/` directory). */
export const SAMPLES = [
  'hello-order.uml',
  'blog.uml',
  'ecommerce.uml',
  'saas-multitenant.uml',
  'japanese-domain.uml',
  'with-attachments.uml',
  'with-custom-theme.uml',
  'reserved-keywords.uml',
  'project-schedule.uml',
] as const;

export type SampleName = (typeof SAMPLES)[number];
