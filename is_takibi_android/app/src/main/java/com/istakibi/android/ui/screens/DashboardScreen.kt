package com.istakibi.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.istakibi.android.model.Task
import com.istakibi.android.ui.components.TaskCard

@Composable
fun DashboardScreen(
    onTaskClick: (Int) -> Unit
) {
    // Örnek veriler
    val tasks = remember {
        listOf(
            Task(1, "Ahmet Yılmaz", "Atatürk Cad. No:15, Kartal", "Kontrol Bekliyor"),
            Task(2, "Mehmet Demir", "Cumhuriyet Mah. 5. Sok.", "Kontrol Yapıldı"),
            Task(3, "Ayşe Kaya", "Bağdat Cad. No:42, Kadıköy", "Depozito Yatırıldı"),
            Task(4, "Fatma Öztürk", "İstiklal Cad. No:88", "Gaz Açıldı")
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp)
    ) {
        // Başlık
        Text(
            text = "Merhaba,",
            color = Color(0xFF94A3B8), // slate-400
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "İş Takibi",
            color = Color.White,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // Arama Kutusu
        OutlinedTextField(
            value = "",
            onValueChange = {},
            placeholder = { Text("İş, müşteri, adres veya telefon ara...", color = Color(0xFF64748B)) },
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp)),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF3B82F6),
                unfocusedBorderColor = Color(0xFF334155),
                focusedContainerColor = Color(0xFF1E293B),
                unfocusedContainerColor = Color(0xFF1E293B),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Görev Listesi
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(tasks) { task ->
                TaskCard(
                    task = task,
                    onClick = { onTaskClick(task.id) }
                )
            }
        }
    }
}
