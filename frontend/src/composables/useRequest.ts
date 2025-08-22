import { ref, Ref, readonly } from 'vue'

interface UseRequestOptions<T> {
    immediate?: boolean
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
}

export const useRequest = <T>(
    request: () => Promise<T>,
    options: UseRequestOptions<T> = {}
) => {
    const loading = ref(false)
    const error = ref<Error | null>(null)
    const data = ref<T | null>(null) as Ref<T | null>

    const execute = async () => {
        loading.value = true
        error.value = null

        try {
            const result = await request()
            data.value = result
            options.onSuccess?.(result)
            return result
        } catch (err) {
            error.value = err as Error
            options.onError?.(err as Error)
            throw err
        } finally {
            loading.value = false
        }
    }

    if (options.immediate !== false) {
        execute()
    }

    return {
        loading: readonly(loading),
        error: readonly(error),
        data: readonly(data),
        execute
    }
}