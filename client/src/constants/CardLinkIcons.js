// Centralized icon and color mappings for card link types
// Icons use Semantic UI icon names; colors use Semantic UI color names
// Extend or adjust here to propagate across all components.

// Keys MUST match the string values in CardLinkTypes (see Enums.js)
export const CardLinkTypeIconMap = {
  relatesTo: 'linkify',
  // Both directions use closed lock, color will differentiate
  blocks: 'lock',
  blockedBy: 'lock',
  duplicates: 'clone outline',
  duplicatedBy: 'clone',
  dependsOn: 'long arrow alternate up',
};

export const CardLinkTypeIconColorMap = {
  relatesTo: 'grey',
  // Requested: "bloque" (blocks) = orange, "est bloqué par" (blockedBy) = red
  blocks: 'orange',
  blockedBy: 'red',
  duplicates: 'blue',
  duplicatedBy: 'blue',
  dependsOn: 'teal',
};

export const getCardLinkTypeIcon = (type) => CardLinkTypeIconMap[type] || 'tag';
export const getCardLinkTypeIconColor = (type) => CardLinkTypeIconColorMap[type] || 'grey';
