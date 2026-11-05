/** Memory reserved per card for the runtime's context and buffers, GB. An assumption, not measured. Used by the goal picker, the models page and the methodology. */
export const OVERHEAD_GB = 1.5

/** Memory held back for the operating system and other programs when weights spill into system RAM, GB. An assumption, not measured. */
export const OS_RESERVE_GB = 8
/** Allowance for the context (KV cache) on top of a model's weights, GB. An assumption: real use grows with context length and the model. */
export const CONTEXT_GB = 4
