package com.example.healbridge

sealed class RepoResult<out T> {
    data class Ok<T>(val value: T) : RepoResult<T>()
    data class Err(val error: Throwable) : RepoResult<Nothing>()
}

