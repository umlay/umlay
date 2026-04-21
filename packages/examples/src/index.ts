/** File names of bundled samples (relative to the `samples/` directory). */
export const SAMPLES = [
  'hello-order.umlay',
  'blog.umlay',
  'ecommerce.umlay',
  'saas-multitenant.umlay',
  'japanese-domain.umlay',
  'with-attachments.umlay',
  'with-custom-theme.umlay',
  'reserved-keywords.umlay',
  'project-schedule.umlay',
] as const;

export type SampleName = (typeof SAMPLES)[number];
