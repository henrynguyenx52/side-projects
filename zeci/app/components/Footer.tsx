"use client";

import React from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Stack,
} from "@mui/material";
import {
  School as SchoolIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  YouTube as YouTubeIcon,
  Twitter as TwitterIcon,
} from "@mui/icons-material";

const Footer = () => {
  return (
    <Box
      sx={{
        backgroundColor: "#1B314B",
        color: "white",
        py: { xs: 4, md: 6 },
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, width: "100%" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, 1fr)",
            },
            gap: 4,
            alignItems: "flex-start",
          }}
        >
          {/* Left side - Logo and contact */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <SchoolIcon sx={{ color: "white", mr: 1, fontSize: 28 }} />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: "bold",
                  color: "white",
                }}
              >
                Zeci TOEIC
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">+84 123 456 789</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <EmailIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">info@zeci.com</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LocationOnIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">
                  123 Đường ABC, Quận 1, TP.HCM
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Right side - Newsletter and social */}
          <Box>
            <Box sx={{ textAlign: { xs: "center", md: "right" } }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Đăng ký nhận tin
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  mb: 3,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <TextField
                  placeholder="Nhập email của bạn"
                  variant="outlined"
                  size="small"
                  sx={{
                    flex: 1,
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      "& fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.3)",
                      },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: "#ff6f00",
                    color: "white",
                    px: 3,
                    py: 1,
                    "&:hover": {
                      backgroundColor: "#e65100",
                    },
                  }}
                >
                  Đăng ký
                </Button>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  justifyContent: { xs: "center", md: "flex-end" },
                }}
              >
                <IconButton
                  sx={{
                    color: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <FacebookIcon />
                </IconButton>
                <IconButton
                  sx={{
                    color: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <InstagramIcon />
                </IconButton>
                <IconButton
                  sx={{
                    color: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <YouTubeIcon />
                </IconButton>
                <IconButton
                  sx={{
                    color: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <TwitterIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
