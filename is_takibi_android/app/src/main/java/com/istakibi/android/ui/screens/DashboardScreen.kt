package com.istakibi.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.istakibi.android.model.Task
import com.istakibi.android.model.RoutineTask
import com.istakibi.android.ui.components.BottomNavigationBar
import com.istakibi.android.ui.components.TaskCard
import com.istakibi.android.viewmodel.DashboardViewModel

@Composable
fun DashboardScreen(
    onTaskClick: (String) -> Unit,
    onSignOut: () -> Unit,
    viewModel: DashboardViewModel = viewModel()
) {
    var activeTab by remember { mutableStateOf("home") }
    // userRole flow'unu henüz ViewModel'e ekledik, buradan okuyalım
    val userRole by viewModel.userRole.collectAsState()

    Scaffold(
        bottomBar = {
            BottomNavigationBar(
                currentTab = activeTab,
                onTabSelected = { activeTab = it }
            )
        },
        containerColor = Color(0xFF0F172A)
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (activeTab) {
                "home" -> HomeView(onTaskClick, viewModel)
                "tasks" -> {
                    // Admin ise tüm listeyi, değilse rutin işleri göster
                    // Şimdilik karmaşıklığı azaltmak için everyone gets mixed list logic similar to web
                    AllTasksView(onTaskClick, viewModel, userRole == "admin")
                }
                "profile" -> ProfileView(onSignOut, viewModel)
            }
        }
    }
}

@Composable
private fun HomeView(
    onTaskClick: (String) -> Unit,
    viewModel: DashboardViewModel
) {
    val tasks by viewModel.tasks.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()

    Column(modifier = Modifier.padding(16.dp)) {
        // Header
        Text("Merhaba,", color = Color(0xFF94A3B8), fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text("İş Takibi", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 16.dp))

        // Search
        SearchInput(searchQuery) { viewModel.onSearchQueryChanged(it) }
        
        Spacer(modifier = Modifier.height(16.dp))

        if (tasks.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Henüz atanmış işiniz yok.", color = Color.Gray)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(tasks) { task ->
                    TaskCard(task = task, onClick = { onTaskClick(task.id) })
                }
            }
        }
    }
}

@Composable
private fun AllTasksView(
    onTaskClick: (String) -> Unit,
    viewModel: DashboardViewModel,
    isAdmin: Boolean
) {
    // Admin: Tüm ham verileri görsün
    // Personel: Rutin işlerini görsün
    val rawTasks by viewModel.rawTasks.collectAsState()
    val routineTasks by viewModel.routineTasks.collectAsState()
    
    val displayList: List<Any> = if (isAdmin) {
        // Admin: Tüm normal işler (Routine tasks Admin view implementation later)
        rawTasks + routineTasks
    } else {
        routineTasks // Personel: Sadece Rutinler
    }

    Column(modifier = Modifier.padding(16.dp)) {
        Text(if (isAdmin) "Tüm Müşteri Portföyü" else "Rutin İşler", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 16.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(displayList.size) { index ->
                val item = displayList[index]
                if (item is Task) {
                     TaskCard(task = item, onClick = { onTaskClick(item.id) })
                } else if (item is RoutineTask) {
                    RoutineTaskCard(task = item)
                }
            }
        }
    }
}

@Composable
private fun RoutineTaskCard(task: RoutineTask) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(task.content, color = Color.White, fontWeight = FontWeight.Bold)
            if (!task.customerName.isNullOrEmpty()) {
                Text(task.customerName, color = Color(0xFF3B82F6), fontSize = 12.sp)
            }
            Text(if (task.isCompleted) "Tamamlandı" else "Bekliyor", color = if (task.isCompleted) Color.Green else Color.Gray, fontSize = 10.sp)
        }
    }
}

@Composable
private fun ProfileView(onSignOut: () -> Unit, viewModel: DashboardViewModel) {
    val email = viewModel.getCurrentUserEmail() ?: "Bilinmiyor"
    
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("Profil", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        Text(email, color = Color.Gray)
        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = onSignOut,
            colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
        ) {
            Text("Çıkış Yap")
        }
    }
}

@Composable
fun SearchInput(query: String, onQueryChanged: (String) -> Unit) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChanged,
        placeholder = { Text("Ara...", color = Color(0xFF64748B)) },
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Color(0xFF3B82F6),
            unfocusedBorderColor = Color(0xFF334155),
            focusedContainerColor = Color(0xFF1E293B),
            unfocusedContainerColor = Color(0xFF1E293B),
            focusedTextColor = Color.White,
            unfocusedTextColor = Color.White
        )
    )
}
