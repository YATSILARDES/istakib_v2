package com.istakibi.android.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.istakibi.android.model.Task
import com.istakibi.android.model.RoutineTask
import com.istakibi.android.repository.TaskRepository
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class DashboardViewModel : ViewModel() {
    private val repository = TaskRepository()
    private val auth = FirebaseAuth.getInstance()
    private val currentUserEmail = auth.currentUser?.email?.lowercase()

    private val _userRole = MutableStateFlow<String?>(null)
    val userRole: StateFlow<String?> = _userRole

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery

    init {
        viewModelScope.launch {
            if (currentUserEmail != null) {
                _userRole.value = repository.getUserRole(currentUserEmail)
            }
        }
    }

    // Combine tasks from repository with search query and filter logic
    val rawTasks: StateFlow<List<Task>> = repository.getTasks()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val routineTasks: StateFlow<List<RoutineTask>> = repository.getRoutineTasks()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val tasks: StateFlow<List<Task>> = combine(rawTasks, _searchQuery) { taskList, query ->
        filterTasks(taskList, query)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    
    fun getCurrentUserEmail(): String? = currentUserEmail

    fun onSearchQueryChanged(query: String) {
        _searchQuery.value = query
    }

    private fun filterTasks(list: List<Task>, query: String): List<Task> {
        // DEBUG MODU: Filtreleri geçici olarak kaldırdım.
        // Tüm 6 veriyi de ekranda görelim.
        return list
        
        /*
        if (currentUserEmail == null) return emptyList()

        val today = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.time

        return list.filter { task ->
            // 1. Assignee Check
            val isAssigned = task.assigneeEmail?.lowercase() == currentUserEmail
            if (!isAssigned) return@filter false

            // 2. Status Check
            // Hide CHECK_COMPLETED
            if (task.status == "check_completed") return@filter false
            // Hide if checkStatus is present (clean or missing)
            if (!task.checkStatus.isNullOrEmpty()) return@filter false

            // 3. Date Check (Today or Past)
            val taskDate = getTaskDate(task)
            if (taskDate != null) {
                // If Future -> Hide
                if (taskDate.after(today) && !isSameDay(taskDate, today)) {
                    return@filter false
                }
            }

            // 4. Search Filter
            if (query.isNotBlank()) {
                val lowerQuery = query.lowercase(Locale("tr"))
                val title = task.title.lowercase(Locale("tr"))
                val address = (task.address ?: "").lowercase(Locale("tr"))
                val phone = (task.phone ?: "").lowercase(Locale("tr"))
                
                if (!title.contains(lowerQuery) && 
                    !address.contains(lowerQuery) && 
                    !phone.contains(lowerQuery)) {
                    return@filter false
                }
            }

            true
        }.sortedBy { getTaskDate(it) ?: Date(0) }
        */
    }

    private fun getTaskDate(task: Task): Date? {
        // Priority 1: Scheduled Date (Timestamp)
        if (task.scheduledDate != null) {
            return task.scheduledDate.toDate()
        }
        
        // Priority 2: Date String (Legacy)
        // Supported formats: YYYY-MM-DD, DD.MM.YYYY
        if (!task.date.isNullOrEmpty()) {
            try {
                // Try ISO
                val isoFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                return isoFormat.parse(task.date)
            } catch (e: Exception) {
                try {
                    // Try TR format
                    val trFormat = SimpleDateFormat("dd.MM.yyyy", Locale.getDefault())
                    return trFormat.parse(task.date)
                } catch (e2: Exception) {
                    return null
                }
            }
        }
        
        // Fallback: Created At
        return task.createdAt?.toDate()
    }

    private fun isSameDay(d1: Date, d2: Date): Boolean {
        val c1 = Calendar.getInstance().apply { time = d1 }
        val c2 = Calendar.getInstance().apply { time = d2 }
        return c1.get(Calendar.YEAR) == c2.get(Calendar.YEAR) &&
               c1.get(Calendar.DAY_OF_YEAR) == c2.get(Calendar.DAY_OF_YEAR)
    }
}
