/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&display=swap');

:root {
  --p:#0B4F8A;--ps:#0E6FBF;--pl:#E9F1F9;--ph:#1A6DB3;
  --g:#2EAD65;--a:#F4C430;--r:#D64545;
}
*{box-sizing:border-box}
body{font-family:'Nunito',sans-serif}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:2px}

@layer components {
  .sidebar{@apply fixed inset-y-0 left-0 w-60 bg-pronea flex flex-col z-50 overflow-y-auto}
  .sb-logo{@apply flex items-center gap-3 px-5 py-5 border-b border-white/10}
  .sb-section{@apply px-3 pt-4 pb-1 text-[9px] font-bold text-white/40 uppercase tracking-widest}
  .sb-item{@apply flex items-center gap-2.5 px-4 py-2.5 mx-2 rounded-lg text-[13px] font-semibold text-white/75 cursor-pointer transition-all hover:bg-white/10 hover:text-white}
  .sb-item.active{@apply bg-white/20 text-white}
  .sb-user{@apply mt-auto p-3 border-t border-white/10 flex items-center gap-2}
  .main{@apply ml-60 flex flex-col min-h-screen bg-gray-50}
  .topbar{@apply sticky top-0 z-40 bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between shadow-sm}
  .page-title{@apply text-lg font-extrabold text-gray-800}
  .pc{@apply p-6}

  /* Cards */
  .sc{@apply bg-white rounded-xl p-5 shadow-sm border-t-4}
  .sc.blue{@apply border-pronea-secondary}
  .sc.green{@apply border-estado-activo}
  .sc.yellow{@apply border-estado-alerta}
  .sc.red{@apply border-estado-inactivo}
  .card{@apply bg-white rounded-xl p-5 shadow-sm border border-gray-100}
  .card-title{@apply text-sm font-bold text-gray-800 mb-3 flex items-center justify-between}
  .g4{@apply grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5}
  .g3{@apply grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5}
  .g2{@apply grid grid-cols-1 md:grid-cols-2 gap-5 mb-5}

  /* Badges */
  .badge{@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold}
  .badge-green{@apply bg-green-100 text-green-800}
  .badge-red{@apply bg-red-100 text-red-800}
  .badge-yellow{@apply bg-yellow-100 text-yellow-800}
  .badge-blue{@apply bg-blue-100 text-blue-800}
  .badge-orange{@apply bg-orange-100 text-orange-800}
  .badge-gray{@apply bg-gray-100 text-gray-600}
  .badge-purple{@apply bg-purple-100 text-purple-800}

  /* Buttons */
  .btn{@apply inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed}
  .btn-p{@apply bg-pronea text-white hover:bg-pronea-hover}
  .btn-s{@apply bg-estado-activo text-white hover:opacity-90}
  .btn-d{@apply bg-estado-inactivo text-white hover:opacity-90}
  .btn-w{@apply bg-estado-alerta text-gray-800 hover:opacity-90}
  .btn-g{@apply bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100}
  .btn-sm{@apply px-3 py-1.5 text-xs}
  .btn-xs{@apply px-2 py-1 text-xs}

  /* Forms */
  .inp{@apply w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white outline-none transition-all focus:border-pronea-secondary focus:ring-2 focus:ring-pronea-secondary/15 disabled:bg-gray-50}
  .lbl{@apply block text-xs font-bold text-gray-600 mb-1}
  .fg{@apply mb-3}
  .fg2{@apply grid grid-cols-2 gap-3}
  .fg3{@apply grid grid-cols-3 gap-3}

  /* Table */
  .tbl{@apply w-full border-collapse text-sm}
  .tbl th{@apply bg-gray-50 px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide}
  .tbl td{@apply px-4 py-3 border-b border-gray-100 text-gray-700}
  .tbl tr:last-child td{@apply border-0}
  .tbl tr:hover td{@apply bg-gray-50}
  .tw{@apply overflow-x-auto}

  /* Modal */
  .mo{@apply fixed inset-0 bg-black/50 flex items-center justify-content z-[200] p-4}
  .mb{@apply bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto}
  .mh{@apply flex items-center justify-between p-5 border-b border-gray-100}
  .mbd{@apply p-5}
  .mf{@apply flex justify-end gap-2 p-5 border-t border-gray-100}

  /* Alert */
  .alert{@apply flex items-start gap-2 p-3 rounded-lg text-sm font-semibold mb-3}
  .al-i{@apply bg-blue-50 text-blue-800}
  .al-s{@apply bg-green-50 text-green-800}
  .al-w{@apply bg-yellow-50 text-yellow-800}
  .al-e{@apply bg-red-50 text-red-800}

  /* Tabs */
  .tabs{@apply flex gap-1 bg-gray-100 p-1 rounded-xl mb-4}
  .tab{@apply px-4 py-2 rounded-lg text-sm font-bold text-gray-500 cursor-pointer transition-all}
  .tab.act{@apply bg-white text-pronea shadow-sm}

  /* Steps */
  .step-dot{@apply w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0}
  .step-dot.done{@apply bg-green-500 text-white}
  .step-dot.cur{@apply bg-pronea text-white}
  .step-dot.todo{@apply bg-gray-200 text-gray-500}

  /* Permission badge */
  .perm-on{@apply flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs font-bold}
  .perm-off{@apply flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold}
  .perm-pending{@apply flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs font-bold}
}

@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.ap{animation:fadeIn .2s ease both}
