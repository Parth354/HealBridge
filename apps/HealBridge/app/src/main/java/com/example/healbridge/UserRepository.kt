package com.example.healbridge
import kotlinx.coroutines.flow.Flow

interface UserRepository {
    fun observe(): Flow<PatientProfile?>
    suspend fun refresh(): RepoResult<PatientProfile>
    suspend fun upsert(profile: PatientProfile): RepoResult<Unit>
    suspend fun updateAddress(address: Address): RepoResult<Unit>
    suspend fun updateConsents(dataUse: Boolean, notifications: Boolean): RepoResult<Unit>
    suspend fun updateLanguage(language: String): RepoResult<Unit>
    suspend fun updateFcmToken(token: String): RepoResult<Unit>
    suspend fun clear(): RepoResult<Unit>
}