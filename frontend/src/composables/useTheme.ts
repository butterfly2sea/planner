import { ref, computed, readonly } from 'vue'

type Theme = 'light' | 'dark' | 'auto'

const theme = ref<Theme>('light')

export const useTheme = () => {
    const isDark = computed(() => {
        if (theme.value === 'auto') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches
        }
        return theme.value === 'dark'
    })

    const setTheme = (newTheme: Theme) => {
        theme.value = newTheme
        localStorage.setItem('theme', newTheme)
        updateDocumentTheme()
    }

    const updateDocumentTheme = () => {
        if (isDark.value) {
            document.documentElement.setAttribute('data-theme', 'dark')
        } else {
            document.documentElement.removeAttribute('data-theme')
        }
    }

    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') as Theme
        if (savedTheme) {
            theme.value = savedTheme
        }
        updateDocumentTheme()

        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDocumentTheme)
    }

    return {
        theme: readonly(theme),
        isDark,
        setTheme,
        initTheme
    }
}