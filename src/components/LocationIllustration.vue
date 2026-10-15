<script setup lang="ts">
import type { AssetId } from '../domain/types';
defineProps<{ id: AssetId; active?: boolean; batteryPercent?: number }>();
</script>

<template>
  <svg viewBox="0 0 180 112" aria-hidden="true" class="building" :class="{ dimmed: active === false }">
    <ellipse cx="90" cy="99" rx="77" ry="10" fill="#07131f" opacity=".35" />
    <path d="M13 98 Q90 84 167 98 L155 104 H25Z" fill="#cbd6df" opacity=".22" />
    <g v-if="id === 'homes'">
      <path d="M20 62L47 36L74 62 M82 54L113 24L146 54" fill="#6f879b" stroke="#dce6e7" stroke-width="4" stroke-linejoin="round" />
      <path d="M26 62H68V96H26Z M88 54H140V96H88Z" fill="#426178" />
      <path d="M41 73H52V96H41 M107 72H120V96H107" fill="#172e40" />
      <path class="windows" d="M30 69H37V79H30Z M57 69H64V79H57Z M94 63H104V74H94Z M124 63H134V74H124Z" />
      <path class="festive" d="M26 63H68 M88 55H140" stroke-width="4" stroke-dasharray="1 7" stroke-linecap="round" />
      <path d="M153 58L140 90H166Z" fill="#397c62" /><circle class="lights" cx="151" cy="78" r="3" />
    </g>
    <g v-else-if="id === 'seniors'">
      <rect x="24" y="36" width="109" height="61" rx="3" fill="#45647a" />
      <path d="M19 36H138" stroke="#dce6e7" stroke-width="5" />
      <path class="windows" d="M34 47H46V58H34Z M57 47H69V58H57Z M80 47H92V58H80Z M104 47H116V58H104Z M34 68H46V79H34Z M57 68H69V79H57Z M104 68H116V79H104Z" />
      <path d="M78 74H94V97H78Z" fill="#172e40" />
      <path d="M146 42L125 96H167Z" fill="#347957" />
      <path class="festive" d="M134 77H158 M140 61H152" stroke-width="4" stroke-dasharray="1 6" stroke-linecap="round" />
      <path class="lights" d="M146 33L149 40H156L150 45L152 52L146 48L140 52L142 45L136 40H143Z" />
    </g>
    <g v-else-if="id === 'hospital'">
      <path d="M24 49H154V98H24Z" fill="#45647a" /><path d="M65 27H115V98H65Z" fill="#668195" />
      <path d="M62 27H118 M22 49H157" stroke="#dce6e7" stroke-width="4" />
      <path d="M85 35H95V60H85Z M78 42H102V52H78Z" fill="#f0ede4" />
      <path class="windows" d="M33 61H44V73H33Z M49 61H60V73H49Z M121 61H132V73H121Z M137 61H148V73H137Z" />
      <path d="M80 80H100V98H80Z" fill="#172e40" />
      <path d="M52 76L42 97H62Z" fill="#347957" /><circle class="lights" cx="52" cy="87" r="3" />
      <path class="festive" d="M67 70H113" stroke-width="4" stroke-dasharray="1 7" stroke-linecap="round" />
    </g>
    <g v-else-if="id === 'square'">
      <path d="M86 20L57 90H117Z" fill="#347957" /><path d="M86 39L63 76H110Z" fill="#418365" />
      <path class="festive" d="M72 51L97 56 M66 67L105 73 M61 82L111 86" stroke-width="4" stroke-dasharray="1 8" stroke-linecap="round" />
      <path class="lights" d="M86 10L89 18H98L91 24L93 32L86 27L79 32L81 24L74 18H83Z" />
      <path d="M15 74H49V97H15Z M128 72H162V97H128Z" fill="#93654c" />
      <path d="M11 73L19 61H47L54 73Z M124 71L132 59H158L166 71Z" fill="#a05b52" stroke="#dce6e7" stroke-width="3" />
      <path class="windows" d="M19 78H45V88H19Z M132 76H158V86H132Z" />
    </g>
    <g v-else-if="id === 'rink'">
      <ellipse cx="90" cy="82" rx="67" ry="20" fill="#638da6" stroke="#d5e6ec" stroke-width="4" />
      <ellipse cx="90" cy="80" rx="59" ry="14" :fill="active === false ? '#4b6374' : '#a7d2df'" />
      <path d="M23 82V36 M157 82V36 M23 39Q90 63 157 39" fill="none" stroke="#72899a" stroke-width="3" />
      <path class="festive" d="M28 43Q90 65 152 43" fill="none" stroke-width="5" stroke-dasharray="1 11" stroke-linecap="round" />
      <g v-if="active !== false" fill="none" stroke="#264456" stroke-width="3" stroke-linecap="round">
        <circle cx="74" cy="66" r="4" fill="#e9b65c" /><path d="M74 71L72 82L65 86 M73 77L84 81 M72 74L82 73" />
        <circle cx="114" cy="69" r="4" fill="#d65b55" /><path d="M114 74L110 85L121 88 M112 79L102 83" />
      </g>
      <path v-else d="M62 76H118V87H62Z" fill="#d65b55" />
    </g>
    <g v-else-if="id === 'chargers'">
      <!-- Drie parkeerplekken: laadpaal links, auto in zijaanzicht ernaast, kabel naar de laadklep. -->
      <g v-for="(x, n) in [14, 66, 118]" :key="x">
        <rect :x="x" y="48" width="9" height="42" rx="2" fill="#637f90" />
        <rect :x="x + 2" y="53" width="5" height="7" rx="1" :fill="active === false ? '#293c4c' : '#69ce98'" />
        <path :d="`M${x + 9} 64C${x + 15} 64 ${x + 12} 80 ${x + 14} 81`" fill="none" stroke="#91abb7" stroke-width="2" />
        <path :d="`M${x + 12} 88V80Q${x + 12} 76 ${x + 16} 75L${x + 20} 74L${x + 26} 67H${x + 37}L${x + 43} 74L${x + 47} 75Q${x + 50} 76 ${x + 50} 80V88Z`" :fill="['#718d9d', '#a05b52', '#5f8a72'][n]" />
        <path :d="`M${x + 22} 74L${x + 27} 69H${x + 31}V74Z M${x + 33} 74V69H${x + 36}L${x + 40} 74Z`" fill="#9fc3d6" />
        <path class="windows" :d="`M${x + 47} 78h3v3h-3Z`" />
        <circle :cx="x + 20" cy="88" r="4.5" fill="#122535" /><circle :cx="x + 20" cy="88" r="1.6" fill="#91abb7" />
        <circle :cx="x + 42" cy="88" r="4.5" fill="#122535" /><circle :cx="x + 42" cy="88" r="1.6" fill="#91abb7" />
      </g>
    </g>
    <g v-else>
      <path d="M30 47L50 32H149L131 47Z" fill="#718d9d" /><path d="M131 47L149 32V82L131 98Z" fill="#304e63" />
      <rect x="30" y="47" width="101" height="51" rx="3" fill="#4b6b7d" />
      <path v-for="x in [39, 48, 57, 66]" :key="x" :d="`M${x} 57v30`" stroke="#304e63" stroke-width="3" />
      <rect x="78" y="60" width="41" height="22" rx="3" fill="#192f40" stroke="#a7bdc7" />
      <rect x="82" y="64" :width="33 * ((batteryPercent ?? 100) / 100)" height="14" rx="1" fill="#61c594" />
      <path d="M120 67H124V75H120Z" fill="#a7bdc7" />
    </g>
  </svg>
</template>

<style scoped>
.building { width: 100%; max-height: 130px; overflow: visible; }
.windows { fill: #ead297; }
.lights { fill: #f6c973; transition: fill .4s; }
.festive { stroke: #f6c973; transition: stroke .4s; }
.dimmed .lights { fill: #506375; }
.dimmed .festive { stroke: #506375; }
</style>
