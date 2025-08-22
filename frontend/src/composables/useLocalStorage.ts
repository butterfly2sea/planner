import {ref, type Ref, watch} from 'vue'

export const useLocalStorage = <T>(
    key: string,
    defaultValue: T
): [Ref<T>, (value: T) => void] => {
    const storedValue = localStorage.getItem(key)
    const initial = storedValue ? JSON.parse(storedValue) : defaultValue

    const state = ref(initial) as Ref<T>

    const setValue = (value: T) => {
        state.value = value
    }

    watch(
        state,
        (newValue) => {
            localStorage.setItem(key, JSON.stringify(newValue))
        },
        {deep: true}
    )

    return [state, setValue]
}