// @flow

/**
 * @module constellate/src/ontology
 */

function getParentType(type: string): string {
  switch(type) {
    case 'ContractAccount':
    case 'ExternalAccount':
      return 'Account';
    case 'ReviewAction':
    case 'TransferAction':
      return 'Action';
    case 'MediaObject':
    case 'MusicComposition':
    case 'MusicPlaylist':
    case 'MusicRecording':
      return 'CreativeWork';
    case 'Copyright':
    case 'Right':
      return 'Intangible';
    case 'AudioObject':
    case 'ImageObject':
      return 'MediaObject';
    case 'MusicAlbum':
    case 'MusicRecording':
      return 'MusicPlaylist';
    case 'MusicGroup':
      return 'Organization';
    case 'Action':
    case 'CreativeWork':
    case 'Intangible':
    case 'Organization':
    case 'Person':
      return 'Thing';
    case 'RightsTransferAction':
      return 'TransferAction';
    default:
      return '';
  }
}

function getSubTypes(type: string): string[] {
  switch(type) {
    case 'Account':
      return [
        'ContractAccount',
        'ExternalAccount'
      ];
    case 'Action':
      return [
        'ReviewAction',
        'TransferAction'
      ];
    case 'CreativeWork':
      return [
        'MediaObject',
        'MusicComposition',
        'MusicPlaylist',
        'MusicRecording'
      ];
    case 'Intangible':
      return [
        'Copyright',
        'Right'
      ];
    case 'MediaObject':
      return [
        'AudioObject',
        'ImageObject'
      ];
    case 'MusicPlaylist':
      return [
        'MusicAlbum',
        'MusicRecording'
      ];
    case 'Organization':
      return ['MusicGroup'];
    case 'Thing':
      return [
        'Action',
        'CreativeWork',
        'Intangible',
        'Organization',
        'Person'
      ];
    case 'TransferAction':
      return ['RightsTransferAction'];
    default:
      return [];
  }
}

function getTypesForProperty(property: string): string[] {
 switch(property) {
   case 'byArtist':
     return ['MusicGroup'];
   case 'composer':
   case 'lyricist':
   case 'member':
   case 'producer':
   case 'publisher':
   case 'recordLabel':
     return [
       'Organization',
       'Person'
     ];
   case 'audio':
     return ['AudioObject'];
   case 'image':
     return ['ImageObject'];
   case 'recordingOf':
     return ['MusicComposition'];
   case 'releaseOf':
     return ['MusicAlbum'];
   case 'track':
     return ['MusicRecording'];
   case 'license':
   case 'transferContract':
     return ['ContractAccount'];
   case 'rightsOf':
     return ['CreativeWork'];
   case 'source':
     return ['Copyright'];
   case 'asserter':
     return [
       'Organization',
       'Person'
     ];
   case 'assertionSubject':
     return ['Thing'];
   default:
     return [];
 }
}

function isAncestorType(ancestor: string, descendant: string): boolean {
  if (ancestor === descendant) return true;
  const parent = getParentType(descendant);
  if (!parent) return false;
  return isAncestorType(ancestor, parent);
}

exports.getParentType = getParentType;
exports.getSubTypes = getSubTypes;
exports.getTypesForProperty = getTypesForProperty;
exports.isAncestorType = isAncestorType;
