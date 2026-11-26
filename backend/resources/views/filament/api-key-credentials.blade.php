<div
    class="space-y-4 text-sm"
    x-data="{
        copied: null,
        copy(text, id) {
            navigator.clipboard.writeText(text).then(() => {
                this.copied = id;
                setTimeout(() => { if (this.copied === id) this.copied = null; }, 2000);
            });
        }
    }"
>
    <div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-700 dark:text-amber-300">
        <p class="font-semibold">تنبيه مهم: الـ Secret يظهر مرة واحدة فقط!</p>
        <p class="mt-1 text-xs opacity-90">
            انسخ القيم التالية الآن واحفظها في ملف <code dir="ltr" class="font-mono font-bold">.env</code> للجهة المرتبطة. لن تتمكن من عرض الـ Secret مرة أخرى بعد إغلاق هذه النافذة.
        </p>
    </div>

    <div class="space-y-3">
        <div>
            <div class="mb-1.5 flex items-center justify-between">
                <label class="text-xs font-bold text-gray-600 dark:text-gray-300" dir="ltr">V2_API_KEY</label>
                <button
                    type="button"
                    @click="copy(@js($key), 'key')"
                    class="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                    <span x-show="copied !== 'key'">نسخ</span>
                    <span x-show="copied === 'key'" x-cloak class="text-emerald-600 dark:text-emerald-400">✓ تم النسخ</span>
                </button>
            </div>
            <div
                dir="ltr"
                class="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 font-mono text-xs text-gray-900 select-all dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >{{ $key }}</div>
        </div>

        <div>
            <div class="mb-1.5 flex items-center justify-between">
                <label class="text-xs font-bold text-gray-600 dark:text-gray-300" dir="ltr">V2_API_SECRET</label>
                <button
                    type="button"
                    @click="copy(@js($secret), 'secret')"
                    class="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                    <span x-show="copied !== 'secret'">نسخ</span>
                    <span x-show="copied === 'secret'" x-cloak class="text-emerald-600 dark:text-emerald-400">✓ تم النسخ</span>
                </button>
            </div>
            <div
                dir="ltr"
                class="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 font-mono text-xs text-gray-900 select-all dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >{{ $secret }}</div>
        </div>

        <div class="pt-1">
            <div class="mb-1.5 flex items-center justify-between">
                <label class="text-xs font-bold text-gray-600 dark:text-gray-300">جاهز للنسخ في ملف <span dir="ltr">.env</span></label>
                <button
                    type="button"
                    @click="copy(@js("V2_API_KEY={$key}\nV2_API_SECRET={$secret}"), 'both')"
                    class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500"
                >
                    <span x-show="copied !== 'both'">نسخ الكل</span>
                    <span x-show="copied === 'both'" x-cloak>✓ تم نسخ الكل</span>
                </button>
            </div>
            <pre
                dir="ltr"
                class="overflow-x-auto rounded-xl border border-gray-200 bg-gray-950 p-3.5 font-mono text-xs leading-relaxed text-emerald-300 select-all dark:border-gray-700"
            >V2_API_KEY={{ $key }}
V2_API_SECRET={{ $secret }}</pre>
        </div>
    </div>
</div>
