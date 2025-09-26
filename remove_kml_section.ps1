# Read the file
$content = Get-Content "c:\Users\KEVINDEEP SINGH\OneDrive\Desktop\SIH_25\Punjab_Transport_Tracker\HTML\admin-dashboard.html"

# Get the parts before and after the KML section
$part1 = $content[0..415]
$part2 = $content[456..($content.Length-1)]

# Combine the parts
$newContent = $part1 + $part2

# Write the new content
$newContent | Set-Content "c:\Users\KEVINDEEP SINGH\OneDrive\Desktop\SIH_25\Punjab_Transport_Tracker\HTML\admin-dashboard.html"

Write-Host "KML section removed successfully"
