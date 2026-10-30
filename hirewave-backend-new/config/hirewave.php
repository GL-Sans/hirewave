<?php

return [
    // Sblocchi gratuiti per ogni azienda al lancio alpha (business plan, par. 12:
    // "trial con sblocchi gratuiti"). 0 = nessuno.
    'sblocchi_gratuiti' => (int) env('HIREWAVE_SBLOCCHI_GRATUITI', 0),
];
