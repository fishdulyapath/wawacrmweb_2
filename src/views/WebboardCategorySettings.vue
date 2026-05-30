<template>
  <div class="p-4 mx-auto pb-24">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <RouterLink to="/webboard" class="p-2 rounded-lg hover:bg-slate-100 transition-colors">
        <svg class="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </RouterLink>
      <h1 class="text-xl font-bold text-slate-800">จัดการหมวดหมู่</h1>
    </div>

    <!-- Category list -->
    <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-4">
      <div v-if="loading" class="py-8 text-center text-slate-400 text-sm">กำลังโหลด...</div>
      <div v-else-if="!categories.length" class="py-8 text-center text-slate-400 text-sm">ยังไม่มีหมวดหมู่</div>

      <div v-for="cat in categories" :key="cat.id">
        <!-- View row -->
        <div v-if="editingId !== cat.id" class="flex items-center gap-3 px-4 py-3">
          <span class="text-xl w-8 text-center">{{ cat.icon }}</span>
          <span class="flex-1 text-sm font-medium text-slate-700">{{ cat.name }}</span>
          <span class="w-4 h-4 rounded-full border border-slate-200 flex-shrink-0" :style="{ background: cat.color }" />
          <span v-if="!cat.is_active" class="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">ซ่อน</span>
          <div v-if="canEditCat(cat)" class="flex gap-1 ml-1">
            <button @click="startEdit(cat)" class="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors" title="แก้ไข">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button @click="deleteCat(cat)" class="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors" title="ลบ">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Edit panel -->
        <div v-else class="px-4 py-4 bg-blue-50/40 space-y-3">
          <!-- Icon picker -->
          <div>
            <label class="text-xs text-slate-500 block mb-1.5">ไอคอน</label>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-3xl w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-xl">{{ editForm.icon }}</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="e in PRESET_EMOJIS"
                :key="e"
                @click="editForm.icon = e"
                class="w-9 h-9 flex items-center justify-center rounded-lg text-xl transition-all hover:scale-110"
                :class="editForm.icon === e ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white border border-slate-200 hover:border-blue-300'"
              >
                {{ e }}
              </button>
            </div>
          </div>
          <!-- Name -->
          <div>
            <label class="text-xs text-slate-500 block mb-1">ชื่อหมวดหมู่</label>
            <input v-model="editForm.name" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="ชื่อหมวดหมู่" />
          </div>
          <!-- Color -->
          <div>
            <label class="text-xs text-slate-500 block mb-1.5">สี Badge</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="c in PRESET_COLORS"
                :key="c"
                @click="editForm.color = c"
                class="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                :style="{ background: c, borderColor: editForm.color === c ? '#1e40af' : 'transparent' }"
                :title="c"
              />
            </div>
          </div>
          <!-- Actions -->
          <div class="flex gap-2 pt-1">
            <button @click="saveEdit(cat.id)" class="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">บันทึก</button>
            <button @click="editingId = null" class="px-4 py-1.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">ยกเลิก</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add new -->
    <div class="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <p class="text-sm font-semibold text-slate-700">+ เพิ่มหมวดหมู่ใหม่</p>

      <!-- Icon picker -->
      <div>
        <label class="text-xs text-slate-500 block mb-1.5">ไอคอน</label>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-3xl w-12 h-12 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl">{{ newForm.icon }}</span>
      
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="e in PRESET_EMOJIS"
            :key="e"
            @click="newForm.icon = e"
            class="w-9 h-9 flex items-center justify-center rounded-lg text-xl transition-all hover:scale-110"
            :class="newForm.icon === e ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-slate-50 border border-slate-200 hover:border-blue-300'"
          >
            {{ e }}
          </button>
        </div>
      </div>

      <!-- Name -->
      <div>
        <label class="text-xs text-slate-500 block mb-1">ชื่อ <span class="text-red-500">*</span></label>
        <input
          v-model="newForm.name"
          class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="ชื่อหมวดหมู่..."
          @keydown.enter="addCat"
        />
      </div>

      <!-- Color -->
      <div>
        <label class="text-xs text-slate-500 block mb-1.5">สี Badge</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="c in PRESET_COLORS"
            :key="c"
            @click="newForm.color = c"
            class="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
            :style="{ background: c, borderColor: newForm.color === c ? '#1e40af' : 'transparent' }"
            :title="c"
          />
        </div>
      </div>

      <!-- Preview + submit -->
      <div class="flex items-center gap-3 pt-1">
        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white" :style="{ backgroundColor: newForm.color }">
          {{ newForm.icon }} {{ newForm.name || "ตัวอย่าง" }}
        </span>
        <button
          @click="addCat"
          :disabled="saving || !newForm.name.trim()"
          class="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          เพิ่มหมวดหมู่
        </button>
      </div>

      <div v-if="errMsg" class="text-sm text-red-600">{{ errMsg }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { RouterLink } from "vue-router";
import api from "../composables/useApi.js";
import { useAuthStore } from "../stores/auth.js";

const auth = useAuthStore();

const PRESET_COLORS = ["#6366f1", "#3b82f6", "#0ea5e9", "#10b981", "#84cc16", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#64748b"];

const PRESET_EMOJIS = [
  "📢",
  "💼",
  "📋",
  "📌",
  "🎯",
  "💡",
  "🔔",
  "⭐",
  "🏆",
  "📊",
  "🛠️",
  "🚀",
  "💬",
  "📝",
  "🌟",
  "🔥",
  "👥",
  "📦",
  "🏷️",
  "✅",
  "❓",
  "⚠️",
  "🔐",
  "🌐",
  "🎉",
  "💰",
  "📅",
  "🗂️",
  "📁",
  "🔍",
  "📞",
  "🤝",
];

const categories = ref([]);
const loading = ref(false);
const saving = ref(false);
const errMsg = ref("");
const editingId = ref(null);

const newForm = reactive({ icon: "🏷️", name: "", color: "#6366f1" });
const editForm = reactive({ icon: "", name: "", color: "" });

function canEditCat(cat) {
  const u = auth.user;
  if (!u) return false;
  return cat.created_by === u.id || u.code?.toUpperCase() === "SUPERADMIN" || ["admin", "manager"].includes(u.role);
}

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get("/webboard/categories?all=true");
    categories.value = data;
  } catch {}
  loading.value = false;
}

async function addCat() {
  errMsg.value = "";
  if (!newForm.name.trim()) {
    errMsg.value = "กรุณาระบุชื่อหมวดหมู่";
    return;
  }
  saving.value = true;
  try {
    const { data } = await api.post("/webboard/categories", {
      name: newForm.name.trim(),
      icon: newForm.icon,
      color: newForm.color,
    });
    categories.value.push(data);
    newForm.name = "";
    newForm.icon = "🏷️";
    newForm.color = "#6366f1";
  } catch (e) {
    errMsg.value = e.response?.data?.error || "เกิดข้อผิดพลาด";
  } finally {
    saving.value = false;
  }
}

function startEdit(cat) {
  editingId.value = cat.id;
  editForm.icon = cat.icon;
  editForm.name = cat.name;
  editForm.color = cat.color;
}

async function saveEdit(id) {
  try {
    const { data } = await api.patch(`/webboard/categories/${id}`, {
      name: editForm.name.trim(),
      icon: editForm.icon,
      color: editForm.color,
    });
    const i = categories.value.findIndex((c) => c.id === id);
    if (i !== -1) categories.value[i] = data;
    editingId.value = null;
  } catch (e) {
    alert(e.response?.data?.error || "บันทึกไม่สำเร็จ");
  }
}

async function deleteCat(cat) {
  if (!confirm(`ลบหมวดหมู่ "${cat.name}" ?`)) return;
  try {
    await api.delete(`/webboard/categories/${cat.id}`);
    categories.value = categories.value.filter((c) => c.id !== cat.id);
  } catch (e) {
    alert(e.response?.data?.error || "ลบไม่สำเร็จ");
  }
}

onMounted(load);
</script>
