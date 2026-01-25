/*
  Global state and constants
*/

const state = {
    rows: [],
    filtered: [],
    awardsBlocks: [],
    tournamentTitle: '',
    tournamentUrl: '',
};

// FFE age category codes
const CATEGORY_CODES = [
    {code: 'ppo', label: 'Petit poussin'},
    {code: 'pou', label: 'Poussin'},
    {code: 'pup', label: 'Pupille'},
    {code: 'ben', label: 'Benjamin'},
    {code: 'min', label: 'Minime'},
    {code: 'cad', label: 'Cadet'},
    {code: 'jun', label: 'Junior'},
    {code: 'sen', label: 'Sénior'},
    {code: 'sep', label: 'Sénior+'},
    {code: 'vet', label: 'Vétéran'},
];
