package com.istakibi.android.ui.components

import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.ui.graphics.vector.ImageVector

@Composable
fun BottomNavigationBar(
    currentTab: String,
    onTabSelected: (String) -> Unit
) {
    NavigationBar(
        containerColor = Color(0xFF1E293B), // Slate-800
        contentColor = Color.White
    ) {
        val items = listOf(
            NavigationItem("home", "İşler", Icons.Filled.Home),
            NavigationItem("tasks", "Liste", Icons.Filled.List),
            NavigationItem("profile", "Profil", Icons.Filled.Person)
        )

        items.forEach { item ->
            NavigationBarItem(
                icon = { Icon(item.icon, contentDescription = item.label) },
                label = { Text(item.label) },
                selected = currentTab == item.id,
                onClick = { onTabSelected(item.id) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Color(0xFF3B82F6), // Blue-500
                    selectedTextColor = Color(0xFF3B82F6),
                    indicatorColor = Color(0xFF1E293B), // Transparent indicator
                    unselectedIconColor = Color(0xFF64748B), // Slate-500
                    unselectedTextColor = Color(0xFF64748B)
                )
            )
        }
    }
}

data class NavigationItem(
    val id: String,
    val label: String,
    val icon: ImageVector
)
